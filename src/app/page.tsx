import { redirect } from "next/navigation";

export default function HomePage() {
  // The app root must always open the vehicle inventory.
  redirect("/vehicles");
}
