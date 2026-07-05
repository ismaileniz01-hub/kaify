export type LegalBlock =
  | { type: "p"; text: string }
  | { type: "ul"; items: string[] };

export type LegalDocumentSection = {
  id: string;
  title: string;
  blocks: LegalBlock[];
};

export type LegalDocument = {
  title: string;
  subtitle: string;
  intro?: string;
  sections: LegalDocumentSection[];
  footer?: string;
};
