import { ProfileCut } from './ProfileCut';
import { round, sum } from '$lib/util/math';
export interface CuttingProcessActions {
    cut(): void;
    calcTotalLength(qty: number, length: number): void;
    colorCodeCut(profileCut: ProfileCut): void;
}

export type CuttingInstructions = {
    qty: number;
    length: number;
    position: string;
};

export type CuttingProcessProps = {
    partNumber: string;
    pcs: number;
    length: number;
    color: string;
    cuttingInstructions: CuttingInstructions[];
};

export class CuttingProcess implements CuttingProcessActions {
    public partNumber: string;
    public pcs: number;
    public length: number;
    private totalLength: number;
    private color: string;
    private cuttingInstructions: CuttingInstructions[];
    private cuts: ProfileCut[] = [];

    private wastage: number = 0;
    private totalLengthCutFromInstructions: number;
    private totalCutLengthPerPosition: { [key: string]: number } = {};

    constructor({
        partNumber,
        pcs,
        length,
        color,
        cuttingInstructions,
    }: CuttingProcessProps) {
        this.partNumber = partNumber;
        this.pcs = pcs;
        this.length = length;
        this.color = color;
        this.cuttingInstructions = cuttingInstructions;
        this.totalLengthCutFromInstructions =
            this.calcTotalLengthCutFromInstructions();
        this.totalLength = this.calcTotalLength(length, pcs);
    }

    public getCutLengthPerPosition(position: string): number {
        return this.totalCutLengthPerPosition[position];
    }

    private calcTotalCutLengthPerPosition(): void {
        for (const cut of this.cuts) {
            const result = round((cut.getLength() * cut.getQty()), 0.5, 3);
            if (!this.totalCutLengthPerPosition[cut.getPosition()]) {
                this.totalCutLengthPerPosition[cut.getPosition()] =
                    result;
            } else {
                this.totalCutLengthPerPosition[cut.getPosition()] +=
                    result;
            }
        }
    }

    getTotalLengthCutFromInstructions(): number {
        return this.totalLengthCutFromInstructions;
    }

    private calcTotalLengthCutFromInstructions(): number {
        return this.cuttingInstructions.reduce((acc, el) => {
            return sum([acc, (el.qty * el.length)]);
        }, 0);
    }

    calcTotalLength(qty: number, length: number): number {
        return round((length * qty), 0.5, 3);
    }

    cut(): void {
        for (const cuttingInstruction of this.cuttingInstructions) {
            const profileCut = new ProfileCut({
                color: this.color,
                length: cuttingInstruction.length,
                position: cuttingInstruction.position,
                qty: cuttingInstruction.qty,
            });
            this.cuts.push(profileCut);
        }
        this.calcWastage();
        this.calcTotalCutLengthPerPosition();
    }

    private calcWastage(): void {
        let totalCutLength = 0;
        for (const cut of this.cuts) {
            totalCutLength += round((cut.getLength() * cut.getQty()), 0.5, 3);
        }
        this.wastage += round((this.totalLength - totalCutLength), 0.5, 3);
    }

    colorCodeCut(profileCut: ProfileCut): void {
        throw new Error('Method not implemented.');
    }

    public getWastage(): number {
        return this.wastage;
    }

    public getPartNumber(): string {
        return this.partNumber;
    }

    public getCuts(): ProfileCut[] {
        return this.cuts;
    }

    public getTotalLength(): number {
        return this.totalLength;
    }
}
