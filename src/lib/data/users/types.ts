export type UserProfile = {
  id: string;
  full_name: string | null;
  phone: string | null;
  role: "admin" | "dealership_user";
  dealership_id: string | null;
  created_at: string;
};

export type UserDealership = {
  id: string;
  name: string;
  is_active: boolean;
};

export type UserEmail = {
  id: string;
  email: string | null;
};

export type UsersPageData = {
  currentUserId: string | null;
  profiles: UserProfile[];
  dealerships: UserDealership[];
  emails: UserEmail[];
};
