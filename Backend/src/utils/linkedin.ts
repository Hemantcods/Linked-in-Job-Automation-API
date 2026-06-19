function isWithin24Hours(timeStr: string) {
  const match = timeStr.match(/^(\d+)(h|d)$/i);

  if (!match) return false;

  const value = Number(match[1]);
  const unit = match[2].toLowerCase();

  if (unit === "h") {
    return value <= 24;
  }

  if (unit === "d") {
    return value <= 1;
  }

  return false;
}   


function parseLinkedInTime(timeStr: string): Date | null {
  const now = new Date();

  const match = timeStr.match(/^(\d+)(h|d|w|mo)$/i);

  if (!match) return null;

  const value = Number(match[1]);
  const unit = match[2].toLowerCase();

  switch (unit) {
    case "h":
      now.setHours(now.getHours() - value);
      break;

    case "d":
      now.setDate(now.getDate() - value);
      break;

    case "w":
      now.setDate(now.getDate() - value * 7);
      break;

    case "mo":
      now.setMonth(now.getMonth() - value);
      break;
  }

  return now;
}

export { isWithin24Hours, parseLinkedInTime };