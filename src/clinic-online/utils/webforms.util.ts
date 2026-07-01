export type WebFormsFields = {
  viewState: string;
  viewStateGenerator: string;
  eventValidation: string;
};

export type BranchOption = {
  id: string;
  label: string;
};

export function extractHidden(html: string, name: string): string {
  const re = new RegExp(`name="${name}" id="${name}" value="([^"]*)"`, 'i');
  const match = html.match(re);
  if (!match) {
    throw new Error(`Could not parse hidden field: ${name}`);
  }
  return match[1];
}

export function parseWebForms(html: string): WebFormsFields {
  return {
    viewState: extractHidden(html, '__VIEWSTATE'),
    viewStateGenerator: extractHidden(html, '__VIEWSTATEGENERATOR'),
    eventValidation: extractHidden(html, '__EVENTVALIDATION'),
  };
}

export function parseBranchOptions(html: string): BranchOption[] {
  const selectMatch = html.match(
    /<select[^>]*MainContent_ClinicsList[^>]*>([\s\S]*?)<\/select>/i,
  );
  if (!selectMatch) return [];

  const options: BranchOption[] = [];
  const re = /<option value="([^"]+)">([^<]*)<\/option>/gi;
  let match: RegExpExecArray | null;
  while ((match = re.exec(selectMatch[1])) !== null) {
    options.push({ id: match[1], label: match[2].trim() });
  }
  return options;
}

export function webFormsPayload(
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

export function loginFailed(html: string): boolean {
  return html.includes('נסיון הכניסה למערכת נכשל');
}

export function parseTenantIdFromBranchPath(branchPath: string): string | null {
  const match = branchPath.match(/[?&]c=(\d+)/);
  return match?.[1] ?? null;
}
