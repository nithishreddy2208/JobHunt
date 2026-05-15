import { Link } from 'react-router-dom';
import { Building2, MapPin, Briefcase, Wallet } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { formatSalary, formatDateRelative } from '@/lib/utils';

export const JobCard = ({ job }) => {
  if (!job) return null;
  return (
    <Link to={`/jobs/${job._id}`} className="block">
      <Card className="h-full transition-colors hover:border-accent">
        <CardContent className="p-5">
          <div className="flex items-start justify-between gap-4">
            <div className="min-w-0">
              <h3 className="truncate text-lg font-semibold text-foreground">{job.title}</h3>
              <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-muted-foreground">
                {job.company?.name && (
                  <span className="inline-flex items-center gap-1">
                    <Building2 className="h-3.5 w-3.5" />
                    {job.company.name}
                  </span>
                )}
                {job.location && (
                  <span className="inline-flex items-center gap-1">
                    <MapPin className="h-3.5 w-3.5" />
                    {job.location}
                  </span>
                )}
              </div>
            </div>
            <span className="shrink-0 text-xs text-muted-foreground">
              {formatDateRelative(job.createdAt)}
            </span>
          </div>

          {job.description && (
            <p className="mt-3 line-clamp-2 text-sm text-muted-foreground">
              {job.description}
            </p>
          )}

          <div className="mt-4 flex flex-wrap items-center gap-2">
            {job.jobType && (
              <Badge variant="outline" className="gap-1">
                <Briefcase className="h-3 w-3" />
                {job.jobType}
              </Badge>
            )}
            {job.experienceLevel && (
              <Badge variant="outline">{job.experienceLevel}</Badge>
            )}
            {(job.salary || job.salary === 0) && (
              <Badge variant="accent" className="gap-1">
                <Wallet className="h-3 w-3" />
                {formatSalary(job.salary)}
              </Badge>
            )}
            {Array.isArray(job.requirements) &&
              job.requirements.slice(0, 3).map((r) => (
                <Badge key={r} variant="default">
                  {r}
                </Badge>
              ))}
          </div>
        </CardContent>
      </Card>
    </Link>
  );
};
