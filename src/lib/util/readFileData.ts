import { read } from 'xlsx';
import { SHEET_NAME } from './consts';

export const readFileData = (filePath: string): Promise<object> => {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        // const workbook = read("C:\\Users\\tanas\\Desktop\\vlad cut optim.xlsx");
        // const data = workbook.Sheets[SHEET_NAME];

        // delete data["!margins"];
        // delete data["!merges"];
        // delete data["!ref"];
        // resolve(data);
    });
};
