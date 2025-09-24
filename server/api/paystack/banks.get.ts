import { getQuery, setResponseStatus } from "h3";
import { serverSupabaseUser } from "#supabase/server";
import { listPaystackBanks } from "../../utils/paystack";

export default defineEventHandler(async (event) => {
  const user = await serverSupabaseUser(event);
  if (!user) {
    setResponseStatus(event, 401);
    return { banks: [] };
  }

  const query = getQuery(event);
  const countryParam = query.country;
  const typeParam = query.type;
  const currencyParam = query.currency;

  const country =
    typeof countryParam === "string" && countryParam.trim()
      ? countryParam.toLowerCase()
      : "ghana";

  const normalizedType =
    typeof typeParam === "string" && typeParam.trim()
      ? typeParam === "bank"
        ? undefined
        : typeParam
      : undefined;

  const currency =
    typeof currencyParam === "string" && currencyParam.trim()
      ? currencyParam
      : country === "ghana"
        ? "GHS"
        : undefined;

  try {
    const banks = await listPaystackBanks({
      country,
      type: normalizedType,
      currency,
    });
    return { banks };
  } catch (error) {
    console.error("[paystack-banks] failed", error);
    setResponseStatus(event, 502);
    return {
      banks: [],
      error: "Unable to fetch Paystack banks right now. Please try again shortly.",
    };
  }
});
