/**
 * Utility to parse work history logs for structured reporting:
 * - Work Completed
 * - Pending Work
 * - Materials Used (with name, quantity, unit)
 * - Working Hours
 * - Progress Percentage
 *
 * Ensures values are extracted honestly from real text without fabricating data.
 */

export type ParsedMaterial = {
  name: string;
  quantity: number;
  unit: string | null;
  raw: string;
};

export type ParsedWorkLogDetails = {
  workCompleted: string;
  pendingWork: string | null;
  materials: ParsedMaterial[];
  workingHours: number | null;
  progressPercentage: number | null;
};

const COMMON_UNITS = [
  "nos",
  "no",
  "qty",
  "pcs",
  "pc",
  "mtrs",
  "mtr",
  "meters",
  "meter",
  "m",
  "units",
  "unit",
  "boxes",
  "box",
  "set",
  "sets",
  "rolls",
  "roll",
  "pkt",
  "pkts",
  "packets",
  "ch",
  "channel",
  "gb",
  "tb",
];

/**
 * Extracts a material item from a text segment (e.g. "4 cameras", "100m Cat6 cable", "500GB HDD").
 */
function parseMaterialItem(segment: string): ParsedMaterial | null {
  const clean = segment.trim().replace(/^[-*•\d+.)\s]+/, "");
  if (!clean || clean.length < 2) return null;

  // Skip sentences or non-material phrases
  const lower = clean.toLowerCase();
  if (
    lower.startsWith("status changed") ||
    lower.startsWith("service request") ||
    lower.startsWith("work completed") ||
    lower.startsWith("pending") ||
    lower.startsWith("testing") ||
    lower.includes("progress")
  ) {
    return null;
  }

  // Match pattern: "<quantity> <unit?> <item name>" (e.g. "4 nos cameras", "500gb hard disk", "100 m cable", "3 cameras")
  const qtyFirstRegex = new RegExp(
    `^(\\d+(?:\\.\\d+)?)\\s*(?:(${COMMON_UNITS.join("|")})\\.?\\s+)?([a-zA-Z0-9\\s/\\-_()]+)$`,
    "i",
  );
  const matchQtyFirst = clean.match(qtyFirstRegex);
  if (matchQtyFirst) {
    const qty = parseFloat(matchQtyFirst[1]);
    const unit = matchQtyFirst[2]?.toLowerCase() || null;
    const name = matchQtyFirst[3]?.trim();
    if (
      name &&
      name.length > 1 &&
      !/^(hours|hrs|hr|mins|min|days|day|percent|%)$/i.test(name)
    ) {
      return {
        name,
        quantity: isNaN(qty) ? 1 : qty,
        unit,
        raw: clean,
      };
    }
  }

  // Match pattern: "<item name> - <quantity> <unit?>" (e.g. "Cat6 Cable - 50 m")
  const nameFirstRegex = new RegExp(
    `^([a-zA-Z0-9\\s/\\-_()]+?)\\s*[-:]\\s*(\\d+(?:\\.\\d+)?)\\s*(${COMMON_UNITS.join("|")})?$`,
    "i",
  );
  const matchNameFirst = clean.match(nameFirstRegex);
  if (matchNameFirst) {
    const name = matchNameFirst[1].trim();
    const qty = parseFloat(matchNameFirst[2]);
    const unit = matchNameFirst[3]?.toLowerCase() || null;
    if (name && name.length > 1) {
      return {
        name,
        quantity: isNaN(qty) ? 1 : qty,
        unit,
        raw: clean,
      };
    }
  }

  // Check known hardware keywords with quantity embedded (e.g. "4th channel DVR", "4PORT POE", "500GB HDD")
  const hardDiskMatch = clean.match(/(\d+)\s*(gb|tb)\s*(?:hdd|hard disk)?/i);
  if (hardDiskMatch) {
    return {
      name: `${hardDiskMatch[1]} ${hardDiskMatch[2].toUpperCase()} Hard Disk`,
      quantity: 1,
      unit: "nos",
      raw: clean,
    };
  }

  // If segment contains hardware keywords, treat as 1 item
  const hardwareKeywordMatch = clean.match(
    /\b(camera|dvr|nvr|router|switch|cable|connector|adapter|poe|smps|wire|rack|dome|bullet)\b/i,
  );
  if (hardwareKeywordMatch) {
    return {
      name: clean,
      quantity: 1,
      unit: "nos",
      raw: clean,
    };
  }

  return null;
}

export function parseWorkHistoryDescription(
  description: string | null | undefined,
): ParsedWorkLogDetails {
  if (!description || !description.trim()) {
    return {
      workCompleted: "Work logged",
      pendingWork: null,
      materials: [],
      workingHours: null,
      progressPercentage: null,
    };
  }

  const raw = description.trim();

  // If this is a standard system status change
  if (raw === "Status changed to Closed") {
    return {
      workCompleted: "Status updated to Closed",
      pendingWork: null,
      materials: [],
      workingHours: null,
      progressPercentage: 100,
    };
  }

  // 1. Extract Working Hours
  let workingHours: number | null = null;
  const hoursMatch =
    raw.match(
      /(?:working\s*hours?|hours?|duration|time\s*spent)[\s:=]+(\d+(?:\.\d+)?)\s*(?:hours?|hrs?|h)?/i,
    ) || raw.match(/\b(\d+(?:\.\d+)?)\s*(?:hours|hrs)\b/i);
  if (hoursMatch) {
    const val = parseFloat(hoursMatch[1]);
    if (!isNaN(val) && val > 0 && val <= 24) {
      workingHours = val;
    }
  }

  // 2. Extract Progress Percentage
  let progressPercentage: number | null = null;
  const progressMatch =
    raw.match(/(?:progress|completion)[\s:=]+(\d+(?:\.\d+)?)\s*%?/i) ||
    raw.match(/\b(\d{1,3})\s*%/);
  if (progressMatch) {
    const pVal = parseFloat(progressMatch[1]);
    if (!isNaN(pVal) && pVal >= 0 && pVal <= 100) {
      progressPercentage = Math.round(pVal);
    }
  }

  // 3. Extract Pending Work Section
  let pendingWork: string | null = null;
  const pendingSectionRegex =
    /(?:pending(?:\s*work)?|remaining(?:\s*work)?)[\s:=]+([^;\n]+)/i;
  const pendingMatch = raw.match(pendingSectionRegex);
  if (pendingMatch) {
    pendingWork = pendingMatch[1].trim();
  }

  // 4. Extract Materials Used Section or items
  const materials: ParsedMaterial[] = [];
  const materialSectionRegex =
    /(?:materials?(?:\s*used)?|items?(?:\s*used)?|parts?(?:\s*used)?)[\s:=]+([^;\n]+)/i;
  const materialSectionMatch = raw.match(materialSectionRegex);

  if (materialSectionMatch) {
    const matList = materialSectionMatch[1].split(/[,/&+\n]/);
    for (const part of matList) {
      const parsed = parseMaterialItem(part);
      if (parsed) {
        materials.push(parsed);
      }
    }
  } else {
    // Check if the entire description or parts of it list hardware items (comma or slash separated)
    const segments = raw.split(/[,/\n;]/);
    for (const part of segments) {
      const parsed = parseMaterialItem(part);
      if (parsed) {
        materials.push(parsed);
      }
    }
  }

  // 5. Clean Work Completed
  let workCompleted = raw;
  // If there's an explicit "Work Completed:" or "Completed:" prefix
  const completedMatch = raw.match(
    /(?:work\s*completed|completed|tasks?)[\s:=]+([^;\n]+)/i,
  );
  if (completedMatch) {
    workCompleted = completedMatch[1].trim();
  } else if (pendingWork) {
    // Remove the pending part from workCompleted
    workCompleted = raw.replace(pendingSectionRegex, "").trim();
  }

  // Clean trailing commas, semicolons or hyphens
  workCompleted = workCompleted.replace(/[;,\-—\s]+$/, "").trim();
  if (!workCompleted) {
    workCompleted = raw;
  }

  return {
    workCompleted,
    pendingWork,
    materials,
    workingHours,
    progressPercentage,
  };
}
