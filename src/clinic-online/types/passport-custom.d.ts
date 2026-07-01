declare module 'passport-custom' {
  import { Strategy as PassportStrategy } from 'passport-strategy';

  export class Strategy extends PassportStrategy {
    constructor(verify: (...args: unknown[]) => void);
  }
}
