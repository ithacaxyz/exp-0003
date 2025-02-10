export function truncateHexString({
  address,
  length = 6,
}: {
  address: string
  length?: number
}) {
  return length > 0
    ? `${address.slice(0, length)}...${address.slice(-length)}`
    : address
}
