export interface SWFTCcoinsInterface {
    id: number,
    coinId: number,
    coinName: string,
    coinCode: string,
    mainNetwork: string,
    contact: string | null,
    coinDecimal: number,
    noSupportCoin: string,
    isSupportAdvanced: string,
    isSupportMemo: string,
    coinCodeShow: string,
    coinImageUrl: string | null,
    status: number
}