import * as yup from "yup";
import { POSITION_COLORS } from "./color-swatch-input";

export type PositionFormData = {
  name: string;
  color: string;
};

export const emptyPositionFormData: PositionFormData = {
  name: "",
  color: POSITION_COLORS[0],
};

export function toPositionPayload(formData: PositionFormData) {
  return {
    name: formData.name.trim(),
    color: formData.color,
  };
}

export function buildPositionValidationSchema(
  t: (key: string) => string,
  namespace: "admin-panel-positions-create" | "admin-panel-positions-edit"
) {
  return yup.object().shape({
    name: yup
      .string()
      .trim()
      .max(50, t(`${namespace}:inputs.name.validation.max`))
      .required(t(`${namespace}:inputs.name.validation.required`)),
    color: yup
      .string()
      .matches(/^#[0-9a-fA-F]{6}$/)
      .required(t(`${namespace}:inputs.color.validation.required`)),
  });
}
