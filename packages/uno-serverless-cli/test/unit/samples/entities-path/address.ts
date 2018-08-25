import { Xyz } from "@entities/xyz";

export interface Address {
  street: string;
  city: string;
  zip: number;
  xyz: Xyz;
}
