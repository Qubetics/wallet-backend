export interface DvpnBuildInterface {
    id?: number;
    platform: 'linux' | 'windows' | 'macos';
    extension: 'deb' | 'exe' | 'pkg';
    file_path: string;
    version?: string;
    created_at?: string;
    updated_at?: string;
}
