export namespace ValueFormatter {
  const numberIntl = new Intl.NumberFormat('en-US', {
    maximumSignificantDigits: 6,
  })

  export function format(num: number) {
    return numberIntl.format(num)
  }
}

export namespace StringFormatter {
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
}
