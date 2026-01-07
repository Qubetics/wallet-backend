export interface NFTInterface {
  id?: number;
  wallet_address?: string;
  token_id?: string;
  image?: string | null;
  description?: string | null;
  image_extension?: string | null;
  text_data?: string | null;
  name: string;
  token_address?: string;
  token_uri?: string | null;
  user_id?: number;
  available?: number;
  balance?: number | null,
  coin_family?: number;
  token_type?: string | null,
  attributes?: string | null,
}
