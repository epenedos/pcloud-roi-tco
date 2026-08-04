import type {
  AnalysisFull,
  AnalysisListItem,
  CalcInputs,
  ComponentRow,
  TShirtSize,
} from "./types";

async function request<T>(url: string, init?: RequestInit): Promise<T> {
  const resp = await fetch(url, {
    headers: { "Content-Type": "application/json" },
    ...init,
  });
  if (!resp.ok) {
    let detail = resp.statusText;
    try {
      const body = await resp.json();
      detail = body.detail ?? detail;
    } catch {
      /* keep statusText */
    }
    throw new Error(typeof detail === "string" ? detail : JSON.stringify(detail));
  }
  return resp.json();
}

export const api = {
  listAnalyses: () => request<AnalysisListItem[]>("/api/analyses"),
  createAnalysis: (body: {
    name: string;
    customer_name?: string;
    description?: string;
    num_passwords?: number;
  }) =>
    request<AnalysisFull>("/api/analyses", {
      method: "POST",
      body: JSON.stringify(body),
    }),
  getAnalysis: (id: string) => request<AnalysisFull>(`/api/analyses/${id}`),
  updateInputs: (id: string, inputs: CalcInputs) =>
    request<AnalysisFull>(`/api/analyses/${id}/inputs`, {
      method: "PUT",
      body: JSON.stringify(inputs),
    }),
  patchAnalysis: (
    id: string,
    body: { name?: string; customer_name?: string; description?: string },
  ) =>
    request<AnalysisFull>(`/api/analyses/${id}`, {
      method: "PATCH",
      body: JSON.stringify(body),
    }),
  duplicateAnalysis: (id: string, name: string) =>
    request<AnalysisFull>(`/api/analyses/${id}/duplicate`, {
      method: "POST",
      body: JSON.stringify({ name }),
    }),
  deleteAnalysis: (id: string) =>
    request<{ deleted: boolean }>(`/api/analyses/${id}`, { method: "DELETE" }),
  inventoryForSize: (size: TShirtSize) =>
    request<{ size: TShirtSize; inventory: ComponentRow[] }>(
      `/api/defaults/inventory/${size}`,
    ),
};
