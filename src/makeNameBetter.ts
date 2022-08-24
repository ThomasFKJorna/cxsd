export const makeNameBetter = (name: string) =>
  name
    // replace Hey_nerd with Hey_Nerd
    .replace(/_(\w)/g, (_, c) => c.toUpperCase())
    // capitalize first letter
    .replace(/^(\w)/, (_, c) => c.toUpperCase())
