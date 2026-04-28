import z from "zod";
import { Filter } from "bad-words";

const filter = new Filter();

const noProfanity = (val) => !filter.isProfane(val);

export const doctorFormSchema = z.object({
  specialty: z.string().min(1, "Specialty is Required").refine(noProfanity, {
    message: "Specialty contains inappropriate language",
  }),
  experience: z
    .number({ invalid_type_error: "Experience Must be a Number" })
    .int()
    .min(1, "Experience Must be At Least 1 Year")
    .max(70, "Experience Must be Less than 70 Years"),
  credentialUrl: z
    .string()
    .url("Please Enter a Valid URL")
    .min(1, "Credential URL is Required"),
  description: z
    .string()
    .min(20, "Description Must be At Least 20 Characters")
    .max(1000, "Description Cannot Exceed 1000 Characters")
    .refine(noProfanity, {
      message: "Description Contains Inappropriate Language",
    }),
});

export const patientFormSchema = z.object({
  age: z
    .number({ invalid_type_error: "Age Must be a Number" })
    .int()
    .min(1, "Age Must be At Least 1 Year")
    .max(120, "Age Must be Less than 120 Years"),
  gender: z.string().min(1, "Gender is Required").refine(noProfanity, {
    message: "Gender Field Contains Inappropriate Language",
  }),
  address: z
    .string()
    .min(5, "Address Must be At Least 5 Characters")
    .refine(noProfanity, {
      message: "Address Contains Inappropriate Language",
    }),
  allergies: z
    .string()
    .optional()
    .refine((val) => !val || noProfanity(val), {
      message: "Allergies Contain Inappropriate Language",
    }),
  food_habit: z.enum(["VEG", "NON_VEG", "BOTH"], {
    invalid_type_error: "Please Select a Valid Food Habit",
  }),
  bp_sys: z
    .number({ invalid_type_error: "Systolic BP Must be a Number" })
    .int()
    .min(70, "Systolic BP Must be At Least 70")
    .max(200, "Systolic BP Must be Less than 200")
    .optional()
    .nullable(),
  bp_dia: z
    .number({ invalid_type_error: "Diastolic BP Must be a Number" })
    .int()
    .min(40, "Diastolic BP Must be At Least 40")
    .max(120, "Diastolic BP Must be Less than 120")
    .optional()
    .nullable(),
  sugar_fasting: z
    .number({ invalid_type_error: "Fasting Sugar Must be a Number" })
    .min(50, "Fasting Sugar Must be At Least 50")
    .max(300, "Fasting Sugar Must be Less than 300")
    .optional()
    .nullable(),
  sugar_pp: z
    .number({ invalid_type_error: "Post Prandial Sugar Must be a Number" })
    .min(50, "Post Prandial Sugar Must be At Least 50")
    .max(400, "Post Prandial Sugar Must be Less than 400")
    .optional()
    .nullable(),
  surgery: z
    .string()
    .optional()
    .refine((val) => !val || noProfanity(val), {
      message: "Surgery Field Contains Inappropriate Language",
    }),
  transfusion: z
    .string()
    .optional()
    .refine((val) => !val || noProfanity(val), {
      message: "Transfusion Field Contains Inappropriate Language",
    }),
  accident: z
    .string()
    .optional()
    .refine((val) => !val || noProfanity(val), {
      message: "Accident Field Contains Inappropriate Language",
    }),
  medical_history: z
    .string()
    .optional()
    .refine((val) => !val || noProfanity(val), {
      message: "Medical History Contains Inappropriate Language",
    }),
});
