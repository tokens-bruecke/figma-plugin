export const getTokenKeyName = (isDTCGFormat: boolean) => {
  if (isDTCGFormat) {
    return {
      value: "$value",
      type: "$type",
      description: "$description",
    };
  }

  return {
    value: "value",
    type: "type",
    description: "description",
  };
};
