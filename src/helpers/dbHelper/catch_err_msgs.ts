import * as Models from '../../models/model/index';

class CatchErrMsgQueries {

    public async catchErrMsgCreate(obj: any) {
        try {
            let data: any = await Models.CatchErrorMsgsModel.create(obj)
            return data;
        } catch (err: any) {
            console.error("Error in catchErrMsgCreate>>", err)
            throw err;
        }
    }

}

const catchErrMsgQueries = new CatchErrMsgQueries();
export default catchErrMsgQueries;
