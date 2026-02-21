export interface TemplateVariables {
  title: string;
  date: string;
  datetime: string;
  type: string;
  [key: string]: string | number | boolean | null | undefined;
}

export function buildTemplateVariables(
  input: Partial<TemplateVariables> = {},
  now: Date = new Date()
): TemplateVariables {
  const datetime = input.datetime ?? now.toISOString();
  const date = input.date ?? datetime.split('T')[0];

  return {
    title: input.title ?? '',
    type: input.type ?? '',
    date,
    datetime
  };
}

export function renderTemplate(template: string, variables: TemplateVariables): string {
  return template.replace(/\{\{\s*([a-zA-Z0-9_-]+)\s*\}\}/g, (match, key) => {
    const value = variables[key as keyof TemplateVariables];
    return value !== undefined ? String(value) : match;
  });
}
