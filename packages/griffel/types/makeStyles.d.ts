export default function makeStyles<Slots extends string | number>(stylesBySlots: Record<Slots, unknown>): () => Record<Slots, string>;
