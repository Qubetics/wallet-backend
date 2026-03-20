export interface DvpnBuildInterface {
    id?: number;
    platform: 'linux' | 'windows';
    extension: 'deb' | 'exe';
    file_path: string;
    version?: string;
    created_at?: string;
    updated_at?: string;
}
