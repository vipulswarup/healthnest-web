export interface Doctor {
  _id?: string;
  id?: string;
  preferredName: string;
  aliases: string[];
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

