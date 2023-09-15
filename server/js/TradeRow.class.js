import {toNumber} from "./utils";

class TradeRow {
	constructor(args) {
		this.m = args.m.toString();
		this.s = args.s.toString();
		this.t = toNumber(args.t);
	}
}