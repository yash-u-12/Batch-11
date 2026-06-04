"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  Card,
  CardContent,
  CardDescription,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { User, Stethoscope, Loader2 } from "lucide-react";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { setUserRole } from "@/actions/onboarding";
import { doctorFormSchema, patientFormSchema } from "@/lib/schema";
import { SPECIALITIES } from "@/lib/specialities";
import useFetch from "@/hooks/use-fetch";
import { useEffect } from "react";
import { Filter } from "bad-words";

const filter = new Filter();

export default function OnboardingPage() {
  const [step, setStep] = useState("choose-role");
  const router = useRouter();

  const { loading, data, fn: submitUserRole } = useFetch(setUserRole);

  const {
    register: registerDoctor,
    handleSubmit: handleDoctorSubmit,
    formState: { errors: doctorErrors },
    setValue: setDoctorValue,
    watch: watchDoctor,
  } = useForm({
    resolver: zodResolver(doctorFormSchema),
    defaultValues: {
      specialty: "",
      experience: undefined,
      credentialUrl: "",
      description: "",
    },
  });

  const {
    register: registerPatient,
    handleSubmit: handlePatientSubmit,
    formState: { errors: patientErrors },
    setValue: setPatientValue,
    watch: watchPatient,
  } = useForm({
    resolver: zodResolver(patientFormSchema),
    defaultValues: {
      age: undefined,
      gender: "",
      address: "",
      food_habit: "",
      allergies: "",
      bp_sys: undefined,
      bp_dia: undefined,
      sugar_fasting: undefined,
      sugar_pp: undefined,
      surgery: "",
      transfusion: "",
      accident: "",
      medical_history: "",
    },
  });

  const specialtyValue = watchDoctor("specialty");
  const genderValue = watchPatient("gender");
  const foodHabitValue = watchPatient("food_habit");

  useEffect(() => {
    if (data && data?.success) {
      router.push(data.redirect);
    }
  }, [data]);

  const onDoctorSubmit = async (data) => {
    if (loading) return;

    const formData = new FormData();
    formData.append("role", "DOCTOR");
    formData.append("specialty", data.specialty);
    formData.append("experience", data.experience.toString());
    formData.append("credentialUrl", data.credentialUrl);
    formData.append("description", data.description);

    await submitUserRole(formData);
  };

  const onPatientSubmit = async (data) => {
    if (loading) return;

    const formData = new FormData();
    formData.append("role", "PATIENT");
    formData.append("age", data.age?.toString() || "");
    formData.append("gender", data.gender || "");
    formData.append("address", data.address || "");
    formData.append("food_habit", data.food_habit || "");
    formData.append("allergies", data.allergies || "");
    formData.append("bp_sys", data.bp_sys?.toString() || "");
    formData.append("bp_dia", data.bp_dia?.toString() || "");
    formData.append("sugar_fasting", data.sugar_fasting?.toString() || "");
    formData.append("sugar_pp", data.sugar_pp?.toString() || "");
    formData.append("surgery", data.surgery || "");
    formData.append("transfusion", data.transfusion || "");
    formData.append("accident", data.accident || "");
    formData.append("medical_history", data.medical_history || "");
    formData.append("bloodGroup", data.bloodGroup || "");
    formData.append("emergencyContact", data.emergencyContact || "");

    await submitUserRole(formData);
  };

  if (step === "choose-role") {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card
          className="border-emerald-900/20 hover:border-emerald-700/40 cursor-pointer transition-all"
          onClick={() => !loading && setStep("patient-form")}
        >
          <CardContent className="pt-6 pb-6 flex flex-col items-center text-center">
            <div className="p-4 bg-emerald-900/20 rounded-full mb-4">
              <User className="h-8 w-8 text-emerald-400" />
            </div>
            <CardTitle className="text-xl font-semibold text-white mb-2">
              Join as a Patient
            </CardTitle>
            <CardDescription className="mb-4">
              Book Appointments, Consult with Doctors, and Manage your
              Healthcare Journey
            </CardDescription>
            <Button
              className="w-full mt-2 bg-emerald-600 hover:bg-emerald-700"
              disabled={loading}
            >
              {loading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Processing...
                </>
              ) : (
                "Continue as Patient"
              )}
            </Button>
          </CardContent>
        </Card>

        <Card
          className="border-emerald-900/20 hover:border-emerald-700/40 cursor-pointer transition-all"
          onClick={() => !loading && setStep("doctor-form")}
        >
          <CardContent className="pt-6 pb-6 flex flex-col items-center text-center">
            <div className="p-4 bg-emerald-900/20 rounded-full mb-4">
              <Stethoscope className="h-8 w-8 text-emerald-400" />
            </div>
            <CardTitle className="text-xl font-semibold text-white mb-2">
              Join as a Doctor
            </CardTitle>
            <CardDescription className="mb-4">
              Create your Professional Profile, Set your Availability, and
              Provide Consultations
            </CardDescription>
            <Button
              className="w-full mt-2 bg-emerald-600 hover:bg-emerald-700"
              disabled={loading}
            >
              Continue as Doctor
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (step === "doctor-form") {
    return (
      <Card className="border-emerald-900/20">
        <CardContent className="pt-6">
          <div className="mb-6">
            <CardTitle className="text-2xl font-bold text-white mb-2">
              Complete Your Doctor Profile
            </CardTitle>
            <CardDescription>
              Please Provide your Professional Details for Verification
            </CardDescription>
          </div>

          <form
            onSubmit={handleDoctorSubmit(onDoctorSubmit)}
            className="space-y-6"
          >
            <div className="space-y-2">
              <Label htmlFor="specialty">Medical Specialty</Label>
              <Select
                value={specialtyValue}
                onValueChange={(value) => setDoctorValue("specialty", value)}
              >
                <SelectTrigger id="specialty">
                  <SelectValue placeholder="Select Your Specialty" />
                </SelectTrigger>
                <SelectContent>
                  {SPECIALITIES.map((spec) => (
                    <SelectItem
                      key={spec.name}
                      value={spec.name}
                      className="flex items-center gap-2"
                    >
                      <span className="text-emerald-400">{spec.icon}</span>
                      {spec.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {doctorErrors.specialty && (
                <p className="text-sm font-medium text-red-500 mt-1">
                  {doctorErrors.specialty.message}
                </p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="experience">Years of Experience</Label>
              <Input
                id="experience"
                type="number"
                placeholder="e.g. 5"
                className={"text-sm"}
                {...registerDoctor("experience", { valueAsNumber: true })}
              />
              {doctorErrors.experience && (
                <p className="text-sm font-medium text-red-500 mt-1">
                  {doctorErrors.experience.message}
                </p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="credentialUrl">Link to Credential Document</Label>
              <Input
                id="credentialUrl"
                type="url"
                placeholder="https://example.com/my-medical-degree.pdf"
                className={"text-sm"}
                {...registerDoctor("credentialUrl")}
              />
              {doctorErrors.credentialUrl && (
                <p className="text-sm font-medium text-red-500 mt-1">
                  {doctorErrors.credentialUrl.message}
                </p>
              )}
              <p className="text-sm text-muted-foreground">
                Please Provide a Link to your Medical Degree or Certification
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="description">Description of Your Services</Label>
              <Textarea
                id="description"
                placeholder="Describe your Expertise, Services, and Approach to Patient Care..."
                rows="4"
                className={"bg-background border h-32 text-sm"}
                {...registerDoctor("description")}
              />
              {doctorErrors.description && (
                <p className="text-sm font-medium text-red-500 mt-1">
                  {doctorErrors.description.message}
                </p>
              )}
            </div>

            <div className="pt-2 flex items-center justify-between">
              <Button
                type="button"
                variant="outline"
                onClick={() => setStep("choose-role")}
                className="border-emerald-900/30"
                disabled={loading}
              >
                Back
              </Button>
              <Button
                type="submit"
                className="bg-emerald-600 hover:bg-emerald-700"
                disabled={loading}
              >
                {loading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Submitting...
                  </>
                ) : (
                  "Submit for Verification"
                )}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    );
  }

  if (step === "patient-form") {
    return (
      <Card className="border-emerald-900/20">
        <CardContent className="pt-6">
          <div className="mb-6">
            <CardTitle className="text-2xl font-bold text-white mb-2">
              Complete Your Patient Profile
            </CardTitle>
            <CardDescription>
              Please Provide Your Health Information to Help Doctors Better
              Understand Your Needs
            </CardDescription>
          </div>
          <form
            onSubmit={handlePatientSubmit(onPatientSubmit)}
            className="space-y-6"
          >
            <div className="space-y-2">
              <Label htmlFor="age">Age</Label>
              <Input
                id="age"
                type="number"
                min="1"
                max="120"
                {...registerPatient("age", { valueAsNumber: true })}
              />
              {patientErrors.age && (
                <p className="text-red-400 text-sm mt-1">
                  {patientErrors.age.message}
                </p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="gender">Gender</Label>
              <Select
                value={genderValue}
                onValueChange={(value) => setPatientValue("gender", value)}
              >
                <SelectTrigger id="gender">
                  <SelectValue placeholder="Select Your Gender" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Male">Male</SelectItem>
                  <SelectItem value="Female">Female</SelectItem>
                  <SelectItem value="Other">Other</SelectItem>
                </SelectContent>
              </Select>
              {patientErrors.gender && (
                <p className="text-red-400 text-sm mt-1">
                  {patientErrors.gender.message}
                </p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="address">Address</Label>
              <Textarea
                id="address"
                rows={2}
                placeholder="Your Current Address"
                className={"bg-background border h-24 text-sm"}
                {...registerPatient("address")}
              />
              {patientErrors.address && (
                <p className="text-red-400 text-sm mt-1">
                  {patientErrors.address.message}
                </p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="food_habit">Food Habit</Label>
              <Select
                value={foodHabitValue}
                onValueChange={(value) => setPatientValue("food_habit", value)}
              >
                <SelectTrigger id="food_habit">
                  <SelectValue placeholder="Select Your Food Habit" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="VEG">Vegetarian</SelectItem>
                  <SelectItem value="NON_VEG">Non-Vegetarian</SelectItem>
                  <SelectItem value="BOTH">Both</SelectItem>
                </SelectContent>
              </Select>
              {patientErrors.food_habit && (
                <p className="text-red-400 text-sm mt-1">
                  {patientErrors.food_habit.message}
                </p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="allergies">Allergies (If Any)</Label>
              <Textarea
                id="allergies"
                rows={2}
                placeholder="List Any Allergies You Have"
                className={"bg-background border h-24 text-sm"}
                {...registerPatient("allergies")}
              />
              {patientErrors.allergies && (
                <p className="text-red-400 text-sm mt-1">
                  {patientErrors.allergies.message}
                </p>
              )}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <Label htmlFor="bp_sys">Blood Pressure (Systolic)</Label>
                <Input
                  id="bp_sys"
                  type="number"
                  min="70"
                  max="200"
                  placeholder="Eg. 120"
                  className={"bg-background border text-sm"}
                  {...registerPatient("bp_sys", { valueAsNumber: true })}
                />
                {patientErrors.bp_sys && (
                  <p className="text-red-400 text-sm mt-1">
                    {patientErrors.bp_sys.message}
                  </p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="bp_dia">Blood Pressure (Diastolic)</Label>
                <Input
                  id="bp_dia"
                  type="number"
                  min="40"
                  max="120"
                  placeholder="Eg. 80"
                  className={"bg-background border text-sm"}
                  {...registerPatient("bp_dia", { valueAsNumber: true })}
                />
                {patientErrors.bp_dia && (
                  <p className="text-red-400 text-sm mt-1">
                    {patientErrors.bp_dia.message}
                  </p>
                )}
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <Label htmlFor="sugar_fasting">Blood Sugar (Fasting)</Label>
                <Input
                  id="sugar_fasting"
                  type="number"
                  step="0.01"
                  min="50"
                  max="300"
                  placeholder="Eg. 95.5"
                  className={"bg-background border text-sm"}
                  {...registerPatient("sugar_fasting", { valueAsNumber: true })}
                />
                {patientErrors.sugar_fasting && (
                  <p className="text-red-400 text-sm mt-1">
                    {patientErrors.sugar_fasting.message}
                  </p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="sugar_pp">Blood Sugar (Post Prandial)</Label>
                <Input
                  id="sugar_pp"
                  type="number"
                  step="0.01"
                  min="50"
                  max="400"
                  placeholder="Eg. 140.5"
                  className={"bg-background border text-sm"}
                  {...registerPatient("sugar_pp", { valueAsNumber: true })}
                />
                {patientErrors.sugar_pp && (
                  <p className="text-red-400 text-sm mt-1">
                    {patientErrors.sugar_pp.message}
                  </p>
                )}
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <Label htmlFor="bloodGroup">Blood Group</Label>
                <Input
                  id="bloodGroup"
                  placeholder="Eg. O+, A-, B+"
                  className={"bg-background border text-sm"}
                  {...registerPatient("bloodGroup")}
                />
                {patientErrors.bloodGroup && (
                  <p className="text-red-400 text-sm mt-1">
                    {patientErrors.bloodGroup.message}
                  </p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="emergencyContact">Emergency Contact (Phone)</Label>
                <Input
                  id="emergencyContact"
                  placeholder="Eg. +91 98765 43210"
                  className={"bg-background border text-sm"}
                  {...registerPatient("emergencyContact")}
                />
                {patientErrors.emergencyContact && (
                  <p className="text-red-400 text-sm mt-1">
                    {patientErrors.emergencyContact.message}
                  </p>
                )}
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="surgery">Previous Surgeries (If Any)</Label>
              <Textarea
                id="surgery"
                rows={2}
                placeholder="List Any Surgeries You've Had"
                className={"bg-background border h-24 text-sm"}
                {...registerPatient("surgery")}
              />
              {patientErrors.surgery && (
                <p className="text-red-400 text-sm mt-1">
                  {patientErrors.surgery.message}
                </p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="transfusion">Blood Transfusions (If Any)</Label>
              <Textarea
                id="transfusion"
                rows={2}
                placeholder="Details of Any Blood Transfusions"
                className={"bg-background border h-24 text-sm"}
                {...registerPatient("transfusion")}
              />
              {patientErrors.transfusion && (
                <p className="text-red-400 text-sm mt-1">
                  {patientErrors.transfusion.message}
                </p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="accident">Major Accidents (If Any)</Label>
              <Textarea
                id="accident"
                rows={2}
                placeholder="Details of Any Major Accidents"
                className={"bg-background border h-24 text-sm"}
                {...registerPatient("accident")}
              />
              {patientErrors.accident && (
                <p className="text-red-400 text-sm mt-1">
                  {patientErrors.accident.message}
                </p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="medical_history">Other Medical History</Label>
              <Textarea
                id="medical_history"
                rows={3}
                placeholder="Any Other Relevant Medical History"
                className={"bg-background border h-24 text-sm"}
                {...registerPatient("medical_history")}
              />
              {patientErrors.medical_history && (
                <p className="text-red-400 text-sm mt-1">
                  {patientErrors.medical_history.message}
                </p>
              )}
            </div>

            <div className="pt-2 flex items-center justify-between">
              <Button
                type="button"
                variant="outline"
                onClick={() => setStep("choose-role")}
                className="border-emerald-900/30"
                disabled={loading}
              >
                Back
              </Button>
              <Button
                type="submit"
                className="bg-emerald-600 hover:bg-emerald-700"
                disabled={loading}
              >
                {loading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Submitting...
                  </>
                ) : (
                  "Complete Profile"
                )}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    );
  }
}
