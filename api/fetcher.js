export const request = async (api, query) => {
  const params = new URLSearchParams(query);
  const intern02Apis = ['gas_price', 'gas_station', 'parking', 'charging_station'];
  const url = `/api/${intern02Apis.includes(api) ? 'intern02' : 'intern01'}/v1/${api}?${params.toString()}`;

  const response = await fetch(url);
  if (!response.ok) {
    throw new Error("failed to fetch", { cause: response });
  }

  return response.json();
}