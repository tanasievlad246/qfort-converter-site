import { ProfileCut } from '$lib/domain/ProfileCut';
import type { ExtractedAssemblyListData } from '$lib/types';
import { CuttingProcess } from '../domain/CuttingProcess';

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
    public columns: string[] = ['Cod', 'Cant.'];

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

                    if (!acc[position]) {
                        acc[position] = {
                            length: (
                                totalCutLengthCurrentPosition +
                                totalWastageForCut
                            ).toFixed(1),
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

        return parseFloat(((part * 100) / whole).toFixed(2));
    }

    private calculateFromPercentage(
        percentage: number,
        wastage: number
    ): number {
        return parseFloat(((percentage / 100) * wastage).toFixed(2));
    }
}

export default new ReportBuilder();
