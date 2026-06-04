export const dynamic = "force-dynamic";

import { getPatientAppointments } from "@/actions/patient";
import { AppointmentCard } from "@/components/appointment-card";
import { PageHeader } from "@/components/page-header";
import { Calendar } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/actions/onboarding";
import { CreditCard } from "lucide-react";
import Link from "next/link";

export default async function PatientAppointmentsPage() {
  const user = await getCurrentUser();
  if (!user || user.role !== "PATIENT") {
    redirect("/onboarding");
  }
  const { appointments, error } = await getPatientAppointments();

  return (
    <div className="container mx-auto px-4 py-8">
      <PageHeader
        icon={<Calendar />}
        title="My Appointments"
        backLink="/doctors"
        backLabel="Find Doctors"
      />

      <Card className="border-emerald-900/20">
        <CardHeader className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 sm:gap-0">
          <CardTitle className="text-xl font-bold text-white flex items-center">
            <Calendar className="h-5 w-5 mr-2 text-emerald-400 shrink-0" />
            Your Scheduled Appointments
          </CardTitle>

          <Link
            href="/pricing"
            className="flex items-center gap-2 px-3 py-1 rounded-lg border bg-emerald-900/20 border-emerald-700/30 hover:bg-emerald-900/30 transition text-sm mt-2 sm:mt-0"
          >
            <CreditCard className="h-4 w-4 text-emerald-400" />
            <span className="text-emerald-400 font-medium">
              {user.credits} <span className="hidden sm:inline">Credits</span>
            </span>
          </Link>
        </CardHeader>

        <CardContent>
          {error ? (
            <div className="text-center py-8">
              <p className="text-red-400">Error: {error}</p>
            </div>
          ) : appointments?.length > 0 ? (
            <div className="space-y-4">
              {appointments.map((appointment) => (
                <AppointmentCard
                  key={appointment.id}
                  appointment={appointment}
                  userRole="PATIENT"
                />
              ))}
            </div>
          ) : (
            <div className="text-center py-8">
              <Calendar className="h-12 w-12 mx-auto text-muted-foreground mb-3" />
              <h3 className="text-xl font-medium text-white mb-2">
                No Appointments Scheduled
              </h3>
              <p className="text-muted-foreground">
                You Don&apos;t Have any Appointments Scheduled Yet. Browse Our
                Doctors and Book Your First Consultation.
              </p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
