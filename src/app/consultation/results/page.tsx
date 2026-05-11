import { Suspense } from 'react';
import Card from '@/components/ui/Card';
import ConsultationResultsContent from './content';

export default function ConsultationResultsPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-white pb-24 flex items-center justify-center">
          <Card>
            <p className="text-[#32375D]">Loading results...</p>
          </Card>
        </div>
      }
    >
      <ConsultationResultsContent />
    </Suspense>
  );
}
