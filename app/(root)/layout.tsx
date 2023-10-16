import { redirect } from 'next/navigation';
import { auth } from '@clerk/nextjs';

export default async function SetupLayout({
  children,
}: {
  children: React.ReactNode
}) {


  return (
    <>
      {children}
    </>
  );
};