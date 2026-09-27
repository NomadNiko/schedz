import * as yup from "yup";

// Must stay in sync with the API's phone validation (create-staff.dto.ts).
export const STAFF_PHONE_PATTERN = /^[+\d\s().-]{7,25}$/;

export type StaffFormData = {
  name: string;
  email: string;
  phone: string;
  positionIds: string[];
};

export const emptyStaffFormData: StaffFormData = {
  name: "",
  email: "",
  phone: "",
  positionIds: [],
};

// Blank optional fields are sent as null so they are stored as "not set".
export function toStaffPayload(formData: StaffFormData) {
  return {
    name: formData.name.trim(),
    email: formData.email.trim() === "" ? null : formData.email.trim(),
    phone: formData.phone.trim() === "" ? null : formData.phone.trim(),
    positionIds: formData.positionIds,
  };
}

export function buildStaffValidationSchema(
  t: (key: string) => string,
  namespace: "admin-panel-staff-create" | "admin-panel-staff-edit"
) {
  return yup.object().shape({
    name: yup
      .string()
      .trim()
      .max(100, t(`${namespace}:inputs.name.validation.max`))
      .required(t(`${namespace}:inputs.name.validation.required`)),
    email: yup
      .string()
      .trim()
      .email(t(`${namespace}:inputs.email.validation.invalid`))
      .defined(),
    phone: yup
      .string()
      .trim()
      .matches(STAFF_PHONE_PATTERN, {
        message: t(`${namespace}:inputs.phone.validation.invalid`),
        excludeEmptyString: true,
      })
      .defined(),
    positionIds: yup.array().of(yup.string().required()).defined(),
  });
}
