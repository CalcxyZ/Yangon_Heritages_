/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export interface HeritageSite {
  id: string;
  name: string;
  description: string;
  category: string;
  latitude: number;
  longitude: number;
  imageUrl: string;
  locationName: string;
  createdAt: string;
  authorId?: string;
}

export interface UserState {
  uid: string;
  email: string | null;
  displayName: string | null;
  isAdmin: boolean;
}

export type CategoryFilter = 'All' | 'Historic' | 'Cultural' | 'Natural' | 'Archeological';
