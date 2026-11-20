/** Workstream 1: true for content posted by the labelled AI house account (MemeBot). */
export const isHouseItem = (item) => Boolean(item?.is_house || item?.isHouse);
