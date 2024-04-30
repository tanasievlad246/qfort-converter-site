export type ProfileCutProps = {
    qty: number;
    length: number;
    position: string;
    color: string;
};

export class ProfileCut {
    private qty: number;
    private length: number;
    private position: string;
    private color: string;

    constructor({ qty, length, position, color }: ProfileCutProps) {
        this.qty = qty;
        this.length = length;
        this.position = position;
        this.color = color;
    }

    public getQty = (): number => this.qty;

    public getLength = (): number => this.length;

    public getPosition = (): string => this.position;

    public getColor = (): string => this.color;
}
