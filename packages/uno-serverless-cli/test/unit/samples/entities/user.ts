import { Address } from "./address";

export interface User {
  address?: Address;
  /**
   * @format email
   */
  email: string;
  /**
   * @minLength 6
   */
  password: string;
  firstName?: string;
  lastName?: string;
}
