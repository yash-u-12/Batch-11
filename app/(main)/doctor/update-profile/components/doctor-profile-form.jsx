"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { doctorFormSchema } from "@/lib/schema";
import { SPECIALITIES } from "@/lib/specialities";
import useFetch from "@/hooks/use-fetch";
import { updateDoctorProfile } from "@/actions/doctor";

export function DoctorProfileForm({ user }) {
  const router = useRouter();
  const [error, setError] = useState("");

  const {
    loading,
    data,
    fn: submitProfileUpdate,
  } = useFetch(updateDoctorProfile);

  const {
    register,
    handleSubmit,
    formState: { errors },
    setValue,
    watch,
  } = useForm({
    resolver: zodResolver(doctorFormSchema),
    defaultValues: {
      specialty: user?.specialty || "",
      experience: user?.experience || undefined,
      credentialUrl: user?.credentialUrl || "",
      description: user?.description || "",
    },
  });

  const specialtyValue = watch("specialty");

  const onSubmit = async (data) => {
    if (loading) return;

    setError("");

    const formData = new FormData();
    formData.append("specialty", data.specialty);
    formData.append("experience", data.experience.toString());
    formData.append("credentialUrl", data.credentialUrl);
    formData.append("description", data.description);

    await submitProfileUpdate(formData);
  };

  if (data?.success) {
    router.push("/doctor/verification");
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
      {error && (
        <div className="bg-red-900/10 border border-red-900/20 rounded-lg p-4 mb-6">
          <p className="text-red-400">{error}</p>
        </div>
      )}

      <div className="space-y-2">
        <Label htmlFor="specialty">Medical Specialty</Label>
        <Select
          value={specialtyValue}
          onValueChange={(value) => setValue("specialty", value)}
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
                {spec.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        {errors.specialty && (
          <p className="text-red-400 text-sm mt-1">
            {errors.specialty.message}
          </p>
        )}
      </div>

      <div className="space-y-2">
        <Label htmlFor="experience">Years of Experience</Label>
        <Input
          id="experience"
          type="number"
          min="1"
          max="70"
          className={"text-sm"}
          {...register("experience", { valueAsNumber: true })}
        />
        {errors.experience && (
          <p className="text-red-400 text-sm mt-1">
            {errors.experience.message}
          </p>
        )}
      </div>

      <div className="space-y-2">
        <Label htmlFor="credentialUrl">Link to Credential Document</Label>
        <Input
          id="credentialUrl"
          type="url"
          className={"text-sm"}
          {...register("credentialUrl")}
        />
        {errors.credentialUrl && (
          <p className="text-red-400 text-sm mt-1">
            {errors.credentialUrl.message}
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
          rows={5}
          placeholder="Describe your Expertise, Services, and Approach to Patient Care..."
          className={"text-sm"}
          {...register("description")}
        />
        {errors.description && (
          <p className="text-red-400 text-sm mt-1">
            {errors.description.message}
          </p>
        )}
      </div>

      <Button
        type="submit"
        disabled={loading}
        className="w-full bg-emerald-600 hover:bg-emerald-700"
      >
        {loading ? (
          <>
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            Updating...
          </>
        ) : (
          "Update Profile"
        )}
      </Button>
    </form>
  );
}
