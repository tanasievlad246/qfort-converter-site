import { ProfileCut } from '$lib/domain/ProfileCut';
import type { ExtractedAssemblyListData } from '$lib/types';
import { CuttingProcess } from '../domain/CuttingProcess';
import { divide, round, sum, toPercent } from '$lib/util/math';

export type CuttingProcessResult = {
    length: string;
    color: string;
    partNumber: string;
    position: string;
};

type ReportCuts = {
    [key: string]: CuttingProcessResult;
};

export type AccessoriesData = {
    partNumber: string;
    qty: number;
    position: string;
};

class ReportBuilder {
    private cuttingProcesses: CuttingProcess[] = [];
    private totalProjectLength: number = 0;

    public reportData: CuttingProcessResult[] = [];
    public accessoriesData: AccessoriesData[] = [];
    public columns: string[] = ['Cod articol', 'Cant.'];

    public buildReport(
        cuttingProcesses: CuttingProcess[],
        assemblyListData: ExtractedAssemblyListData
    ): void {
        this.cuttingProcesses = cuttingProcesses;
        this.calculateTotalProjectLength();
        const rows: ReportCuts[] = [];

        for (const process of cuttingProcesses) {
            let wastage = process.getWastage();

            /**
             * Get total length of all the cuts from the cutting instructions
             * Calculate total length per position
             * Find out percentage for each position out of the total length
             * Calculate wastage for each position
             * Add the percent of wastage to the total of the position
             */
            const totalLengthFromInstructions =
                process.getTotalLengthCutFromInstructions();

            const row = process
                .getCuts()
                .reduce((acc: ReportCuts, el: ProfileCut) => {
                    const position = el.getPosition();
                    const color = el.getColor();
                    const partNumber = process.getPartNumber();

                    const totalCutLengthCurrentPosition =
                        process.getCutLengthPerPosition(position);
                    const percentage = this.calculatePercentage(
                        totalCutLengthCurrentPosition,
                        totalLengthFromInstructions
                    );
                    const totalWastageForCut = this.calculateFromPercentage(
                        percentage,
                        wastage
                    );

                    const _length = round(
                        (round(
                            sum([totalCutLengthCurrentPosition, totalWastageForCut]),
                            0.5,
                            3
                        ) / 1000), 0.5, 3); // Divide by 1000 to convert to meters

                    if (!acc[position]) {
                        acc[position] = {
                            length: divide(_length, assemblyListData.partsQty[position].quantity).toFixed(3).replace('.', ','),
                            color,
                            partNumber,
                            position,
                        };
                    }

                    return acc;
                }, {});

            rows.push(row);
        }

        this.flattenReportData(rows);
        this.createAccessoriesRows(assemblyListData);
    }

    private createAccessoriesRows(
        assemblyListData: ExtractedAssemblyListData
    ): void {
        const keys = Object.keys(assemblyListData.partsQty);
        this.accessoriesData = [];

        for (const key of keys) {
            for (
                let i = 0;
                i < assemblyListData.partsQty[key].data.length;
                i++
            ) {
                const partNumber = assemblyListData.partsNumbers[key][i];
                const qty =
                    assemblyListData.partsQty[key].data[i].split(' ')[0];

                this.accessoriesData.push({
                    partNumber,
                    qty: parseFloat(qty),
                    position: key,
                });
            }
        }
    }

    public getListOfPositions(): Set<string> {
        return this.cuttingProcesses.reduce(
            (acc: Set<string>, el: CuttingProcess) => {
                const cuts = el.getCuts();
                for (const cut of cuts) {
                    acc.add(cut.getPosition());
                }
                return acc;
            },
            new Set<string>()
        );
    }

    private flattenReportData(rows: ReportCuts[]): void {
        this.reportData = rows.reduce(
            (acc: CuttingProcessResult[], el: ReportCuts) => {
                const keys = Object.keys(el);
                for (const key of keys) {
                    acc.push(el[key]);
                }
                return acc;
            },
            []
        );
    }

    private calculateTotalProjectLength(): void {
        this.totalProjectLength = this.cuttingProcesses.reduce(
            (acc: number, el: CuttingProcess) => acc + el.getTotalLength(),
            0
        );
    }

    /**
     *
     * @param part value for total length of the part
     * @param whole value for total length of all the cuts
     */
    private calculatePercentage(part: number, whole: number): number {
        if (part > this.totalProjectLength) {
            throw new Error('Length is greater than the total project length');
        }

        return toPercent(part, whole);
    }

    private calculateFromPercentage(
        percentage: number,
        wastage: number
    ): number {
        return round(((percentage / 100) * wastage), 1, 3)
    }
}

export default new ReportBuilder();
