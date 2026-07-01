export type SearchByPhoneRequest = {
  phoneNumber: string;
  userId?: string;
  lastName?: string;
};

/** ASMX body — HAR/browser capture: SearchByPhone(PhoneNumber, UserID, LastName) */
export function buildSearchByPhoneBody(
  options: SearchByPhoneRequest,
): Record<string, string> {
  return {
    PhoneNumber: options.phoneNumber,
    UserID: options.userId ?? '',
    LastName: options.lastName ?? '',
  };
}
