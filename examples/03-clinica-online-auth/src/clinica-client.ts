export type ClinicaConfig = {
  baseUrl: string;
  username: string;
  password: string;
  branchId: string;
};

export type BranchOption = {
  id: string;
  label: string;
};

export type Patient = {
  userId: string;
  firstName: string;
  lastName: string;
  cellPhone: string;
  email: string;
  lastVisit: string;
  branchId: number;
  petsList: string;
  recordId: number;
};

export type ClinicReminder = {
  eventId: number;
  patientId: string;
  patientName: string;
  petId: number;
  cellPhone: string;
  reminderText: string;
  dueDate: string;
  visitDate: string;
  followCategoryId: number;
  confirmed: number;
  therapistName: string;
};

type WebFormsFields = {
  viewState: string;
  viewStateGenerator: string;
  eventValidation: string;
};

export class ClinicaOnlineClient {
  private readonly jar = new Map<string, string>();
  private calendarPath: string | null = null;

  constructor(private readonly config: ClinicaConfig) {}

  get cookies(): ReadonlyMap<string, string> {
    return this.jar;
  }

  async loginAndSelectBranch(): Promise<{ branchId: string; calendarPath: string }> {
    const loginPage = await this.httpGet('/login.aspx');
    const loginHidden = this.parseWebForms(loginPage.html);

    const loginPost = await this.httpPostForm(
      '/login.aspx',
      this.webFormsPayload(loginHidden, {
        'ctl00$MainContent$Login1$UserName': this.config.username,
        'ctl00$MainContent$Login1$Password': this.config.password,
        'ctl00$MainContent$Login1$LoginButton': 'כניסה',
        'ctl00$IsMobile': 'false',
      }),
      '/login.aspx',
    );

    if (loginPost.status === 200 && this.loginFailed(loginPost.html)) {
      throw new Error('Login failed — invalid username or password');
    }
    if (!loginPost.location) {
      throw new Error(`Login did not redirect (status ${loginPost.status})`);
    }

    const branchPath = loginPost.location;
    const branchPage = await this.httpGet(branchPath, '/login.aspx');
    const branches = this.parseBranchOptions(branchPage.html);
    const branchId = this.pickBranchId(branches, this.config.branchId);
    if (!branchId) {
      const list = branches.map((b) => `${b.id} (${b.label})`).join(', ');
      throw new Error(`Branch required. Available: ${list || '(none parsed)'}`);
    }

    const branchHidden = this.parseWebForms(branchPage.html);
    const branchPost = await this.httpPostForm(
      branchPath,
      this.webFormsPayload(branchHidden, {
        'ctl00$MainContent$ClinicsList': branchId,
        'ctl00$MainContent$Button1': 'שלח',
        'ctl00$IsMobile': 'false',
      }),
      branchPath,
    );

    if (!branchPost.location) {
      throw new Error(`Branch selection did not redirect (status ${branchPost.status})`);
    }

    this.calendarPath = branchPost.location;
    await this.httpGet(this.calendarPath, branchPath);

    return { branchId, calendarPath: this.calendarPath };
  }

  async getLastPatients(options?: { move?: number; fromDate?: string }): Promise<Patient[]> {
    const move = options?.move ?? 0;
    const fromDate = options?.fromDate ?? '';

    // HAR 03: page context referer; optional GET warms session like the browser
    const patientListPath = '/vetclinic/therapists/patientlistvet.aspx';
    await this.httpGet(patientListPath, this.calendarPath ?? '/vetclinic/managersa/newcalander.aspx');

    const res = await this.httpPostJson<{ d: RegPersonal[] }>(
      '/Restricted/dbCalander.asmx/GetLastPatients',
      { move, fromDate },
      patientListPath,
    );

    return res.d.map(mapPatient);
  }

  async loadClinicReminders(options?: {
    selectedCat?: string;
    fromDate?: string;
    toDate?: string;
    date?: Date;
  }): Promise<ClinicReminder[]> {
    const date = options?.date ?? new Date();
    const formatted = formatClinicaDate(date);
    const patientListPath = '/vetclinic/therapists/patientlistvet.aspx';
    await this.httpGet(patientListPath, this.calendarPath ?? '/vetclinic/managersa/newcalander.aspx');

    const body = {
      SelectedCat: options?.selectedCat ?? process.env.CLINICA_REMINDER_CATEGORY_ID ?? '13',
      forExcel: 0,
      AllBranches: 1,
      SelectedEmp: '',
      GetConfirmed: 1,
      TherapistID: '',
      sEventDate: '',
      fromDate: options?.fromDate ?? formatted,
      toDate: options?.toDate ?? formatted,
      addOrSubstract: 1,
    };

    const res = await this.httpPostJson<{ d: RegSessionRem[] }>(
      '/Restricted/dbCalander.asmx/LoadClinicReminders',
      body,
      patientListPath,
    );

    return res.d.map(mapReminder);
  }

  /** Open reminders only — Clinica `Confirmed === 0`. */
  async loadOpenClinicReminders(options?: {
    selectedCat?: string;
    fromDate?: string;
    toDate?: string;
    date?: Date;
  }): Promise<ClinicReminder[]> {
    const all = await this.loadClinicReminders(options);
    return all.filter((r) => r.confirmed === 0);
  }

  async searchByPhone(options: {
    phoneNumber: string;
    userId?: string;
    lastName?: string;
  }): Promise<Patient[]> {
    const patientListPath = '/vetclinic/therapists/patientlistvet.aspx';
    await this.httpGet(patientListPath, this.calendarPath ?? '/vetclinic/managersa/newcalander.aspx');

    const res = await this.httpPostJson<{ d: RegPersonal[] }>(
      '/Restricted/dbCalander.asmx/SearchByPhone',
      {
        PhoneNumber: options.phoneNumber,
        UserID: options.userId ?? '',
        LastName: options.lastName ?? '',
      },
      patientListPath,
    );

    return res.d.map(mapPatient);
  }

  /** Open reminders enriched with SearchByPhone owner details (cached per phone). */
  async loadOpenRemindersWithOwnerDetails(options?: {
    selectedCat?: string;
    fromDate?: string;
    toDate?: string;
    date?: Date;
  }): Promise<
    Array<
      ClinicReminder & {
        ownerDetails: Patient | null;
        ownerSearchHits: number;
      }
    >
  > {
    const open = await this.loadOpenClinicReminders(options);
    const phoneCache = new Map<string, Patient[]>();
    const enriched: Array<
      ClinicReminder & { ownerDetails: Patient | null; ownerSearchHits: number }
    > = [];

    for (const reminder of open) {
      const phone = reminder.cellPhone.trim();
      if (!phone) {
        enriched.push({ ...reminder, ownerDetails: null, ownerSearchHits: 0 });
        continue;
      }

      let hits = phoneCache.get(phone);
      if (!hits) {
        hits = await this.searchByPhone({ phoneNumber: phone });
        phoneCache.set(phone, hits);
      }

      const ownerDetails =
        hits.find((p) => p.userId === reminder.patientId) ?? (hits.length === 1 ? hits[0] : null);

      enriched.push({ ...reminder, ownerDetails, ownerSearchHits: hits.length });
    }

    return enriched;
  }

  private pickBranchId(options: BranchOption[], configured: string): string | null {
    if (configured) return configured;
    if (options.length === 1) return options[0].id;
    return null;
  }

  private loginFailed(html: string): boolean {
    return html.includes('נסיון הכניסה למערכת נכשל');
  }

  private parseWebForms(html: string): WebFormsFields {
    return {
      viewState: this.extractHidden(html, '__VIEWSTATE'),
      viewStateGenerator: this.extractHidden(html, '__VIEWSTATEGENERATOR'),
      eventValidation: this.extractHidden(html, '__EVENTVALIDATION'),
    };
  }

  private extractHidden(html: string, name: string): string {
    const re = new RegExp(`name="${name}" id="${name}" value="([^"]*)"`, 'i');
    const match = html.match(re);
    if (!match) throw new Error(`Could not parse hidden field: ${name}`);
    return match[1];
  }

  private parseBranchOptions(html: string): BranchOption[] {
    const selectMatch = html.match(
      /<select[^>]*MainContent_ClinicsList[^>]*>([\s\S]*?)<\/select>/i,
    );
    if (!selectMatch) return [];
    const options: BranchOption[] = [];
    const re = /<option value="([^"]+)">([^<]*)<\/option>/gi;
    let m: RegExpExecArray | null;
    while ((m = re.exec(selectMatch[1])) !== null) {
      options.push({ id: m[1], label: m[2].trim() });
    }
    return options;
  }

  private webFormsPayload(
    hidden: WebFormsFields,
    extra: Record<string, string>,
  ): Record<string, string> {
    return {
      __LASTFOCUS: '',
      __EVENTTARGET: '',
      __EVENTARGUMENT: '',
      __VIEWSTATE: hidden.viewState,
      __VIEWSTATEGENERATOR: hidden.viewStateGenerator,
      __VIEWSTATEENCRYPTED: '',
      __EVENTVALIDATION: hidden.eventValidation,
      __sc: '',
      ...extra,
    };
  }

  private cookieHeader(): string {
    return [...this.jar.entries()].map(([k, v]) => `${k}=${v}`).join('; ');
  }

  private absorbSetCookie(response: Response): void {
    const raw = response.headers.getSetCookie?.() ?? [];
    for (const line of raw) {
      const pair = line.split(';')[0];
      const eq = pair.indexOf('=');
      if (eq === -1) continue;
      this.jar.set(pair.slice(0, eq).trim(), pair.slice(eq + 1).trim());
    }
  }

  private resolveUrl(pathOrUrl: string): string {
    if (pathOrUrl.startsWith('http')) return pathOrUrl;
    const base = this.config.baseUrl.replace(/\/$/, '');
    return `${base}${pathOrUrl.startsWith('/') ? '' : '/'}${pathOrUrl}`;
  }

  private async httpGet(
    pathOrUrl: string,
    referer?: string,
  ): Promise<{ status: number; html: string; location: string | null }> {
    const headers: Record<string, string> = { Cookie: this.cookieHeader() };
    if (referer) headers.Referer = this.resolveUrl(referer);

    const res = await fetch(this.resolveUrl(pathOrUrl), {
      headers,
      redirect: 'manual',
    });
    this.absorbSetCookie(res);
    const html = await res.text();
    return { status: res.status, html, location: res.headers.get('location') };
  }

  private async httpPostForm(
    pathOrUrl: string,
    fields: Record<string, string>,
    referer?: string,
  ): Promise<{ status: number; html: string; location: string | null }> {
    const headers: Record<string, string> = {
      'Content-Type': 'application/x-www-form-urlencoded',
      Cookie: this.cookieHeader(),
      Origin: this.config.baseUrl.replace(/\/$/, ''),
    };
    if (referer) headers.Referer = this.resolveUrl(referer);

    const res = await fetch(this.resolveUrl(pathOrUrl), {
      method: 'POST',
      headers,
      body: new URLSearchParams(fields).toString(),
      redirect: 'manual',
    });
    this.absorbSetCookie(res);
    const html = await res.text();
    return {
      status: res.status,
      html,
      location: res.headers.get('location'),
    };
  }

  private async httpPostJson<T>(
    pathOrUrl: string,
    body: unknown,
    referer: string,
  ): Promise<T> {
    const res = await fetch(this.resolveUrl(pathOrUrl), {
      method: 'POST',
      headers: {
        Accept: '*/*',
        'Content-Type': 'application/json; charset=UTF-8',
        Cookie: this.cookieHeader(),
        Origin: this.config.baseUrl.replace(/\/$/, ''),
        Referer: this.resolveUrl(referer),
        'X-Requested-With': 'XMLHttpRequest',
      },
      body: JSON.stringify(body),
    });
    this.absorbSetCookie(res);

    const text = await res.text();
    if (!res.ok) {
      throw new Error(`POST ${pathOrUrl} failed (${res.status}): ${text.slice(0, 200)}`);
    }

    let parsed: T;
    try {
      parsed = JSON.parse(text) as T;
    } catch {
      throw new Error(`POST ${pathOrUrl} returned non-JSON: ${text.slice(0, 200)}`);
    }
    return parsed;
  }
}

type RegPersonal = {
  UserID: string;
  FirstName: string;
  LastName: string;
  CellPhone: string;
  Email: string;
  LastVisit: string;
  BranchID: number;
  PetsList: string;
  recordID: number;
};

function mapPatient(raw: RegPersonal): Patient {
  return {
    userId: raw.UserID,
    firstName: raw.FirstName,
    lastName: raw.LastName,
    cellPhone: raw.CellPhone,
    email: raw.Email,
    lastVisit: raw.LastVisit,
    branchId: raw.BranchID,
    petsList: raw.PetsList,
    recordId: raw.recordID,
  };
}

type RegSessionRem = {
  EventID: number;
  PatientID: string;
  PatientName: string;
  PetID: number;
  CellPhone: string;
  Reminder: string;
  Date: string;
  DateEvent: string;
  FollowCatID: number;
  Confirmed: number;
  TherapistName: string;
};

function formatClinicaDate(date: Date): string {
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${month}/${day}/${date.getFullYear()}`;
}

function mapReminder(raw: RegSessionRem): ClinicReminder {
  return {
    eventId: raw.EventID,
    patientId: raw.PatientID,
    patientName: raw.PatientName,
    petId: raw.PetID,
    cellPhone: raw.CellPhone,
    reminderText: raw.Reminder,
    dueDate: raw.Date,
    visitDate: raw.DateEvent,
    followCategoryId: raw.FollowCatID,
    confirmed: raw.Confirmed,
    therapistName: raw.TherapistName,
  };
}

export function configFromEnv(): ClinicaConfig {
  const baseUrl = (process.env.CLINICA_BASE_URL ?? 'https://toran.clinicaonline.co.il').replace(
    /\/$/,
    '',
  );
  const username = process.env.CLINICA_USERNAME?.trim() ?? '';
  const password = process.env.CLINICA_PASSWORD ?? '';
  const branchId = process.env.CLINICA_BRANCH_ID?.trim() ?? '';

  if (!username || !password) {
    throw new Error('Set CLINICA_USERNAME and CLINICA_PASSWORD in .env');
  }
  if (!branchId) {
    throw new Error('Set CLINICA_BRANCH_ID in .env (e.g. 41016_41002_0 for Florentin)');
  }

  return { baseUrl, username, password, branchId };
}
