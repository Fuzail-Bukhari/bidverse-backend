const isOperatorKey = (key) => key.startsWith("$") || key.includes(".");

const scrub = (obj) => {
  if (obj && typeof obj === "object") {
    for (const key of Object.keys(obj)) {
      if (isOperatorKey(key)) delete obj[key];
      else scrub(obj[key]);
    }
  }
  return obj;
};

export const mongoSanitize = (req, res, next) => {
  if (req.body) scrub(req.body);
  if (req.params) scrub(req.params);
  next();
};