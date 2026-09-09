"use server";

import {
  getDealershipsByCity,
} from "@/lib/data/dealerships/getDealershipsByCity";

export async function getDealershipsByCityAction(cityId: string) {
  return getDealershipsByCity(cityId);
}
