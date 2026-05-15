import { useEffect, useRef, useState } from 'react';
import { useQuery, keepPreviousData } from '@tanstack/react-query';
import { Search, MapPin, Filter, ChevronLeft, ChevronRight, Loader2 } from 'lucide-react';
import { jobApi } from '@/api/job.api';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';
import { JobCard } from '@/components/jobs/JobCard';
import { useDebounce } from '@/hooks/useDebounce';
import { cn } from '@/lib/utils';

const JOB_TYPES = ['Full-time', 'Part-time', 'Contract', 'Internship'];
const PAGE_SIZE = 10;

export default function JobsListPage() {
  // What the user is currently typing
  const [keyword, setKeyword] = useState('');
  const [location, setLocation] = useState('');
  // What was actually submitted (drives the list query). Job type submits immediately when clicked.
  const [submittedKeyword, setSubmittedKeyword] = useState('');
  const [submittedLocation, setSubmittedLocation] = useState('');
  const [jobType, setJobType] = useState('');
  const [page, setPage] = useState(1);

  // Autocomplete (debounced; backed by in-memory trie, no Mongo/Redis hits)
  const [showSuggest, setShowSuggest] = useState(false);
  const debouncedKeyword = useDebounce(keyword, 200);
  const suggestRef = useRef(null);

  const suggestQuery = useQuery({
    queryKey: ['job', 'suggest', debouncedKeyword],
    queryFn: () => jobApi.suggest(debouncedKeyword, 8),
    enabled: !!debouncedKeyword.trim() && showSuggest,
    staleTime: 30_000
  });

  // Reset to page 1 whenever a NEW search is submitted
  useEffect(() => {
    setPage(1);
  }, [submittedKeyword, submittedLocation, jobType]);

  const listQuery = useQuery({
    queryKey: ['jobs', { keyword: submittedKeyword, location: submittedLocation, jobType, page }],
    queryFn: () =>
      jobApi.list({
        keyword: submittedKeyword || undefined,
        location: submittedLocation || undefined,
        jobType: jobType || undefined,
        page,
        limit: PAGE_SIZE
      }),
    placeholderData: keepPreviousData
  });

  const submitSearch = (kw = keyword, loc = location) => {
    setSubmittedKeyword(kw.trim());
    setSubmittedLocation(loc.trim());
    setShowSuggest(false);
  };

  const clearSearch = () => {
    setKeyword('');
    setLocation('');
    setSubmittedKeyword('');
    setSubmittedLocation('');
    setJobType('');
  };

  // Close suggest on outside click
  useEffect(() => {
    const onClick = (e) => {
      if (suggestRef.current && !suggestRef.current.contains(e.target)) {
        setShowSuggest(false);
      }
    };
    document.addEventListener('mousedown', onClick);
    return () => document.removeEventListener('mousedown', onClick);
  }, []);

  const jobs = listQuery.data?.jobs || [];
  const totalPages = listQuery.data?.totalPages || 1;
  const totalJobs = listQuery.data?.totalJobs ?? 0;

  return (
    <div className="container py-8">
      <header className="mb-6">
        <h1 className="text-3xl font-bold tracking-tight">Browse jobs</h1>
        <p className="mt-1 text-muted-foreground">
          {listQuery.isLoading ? 'Loading…' : `${totalJobs} job${totalJobs === 1 ? '' : 's'} available`}
        </p>
      </header>

      {/* Filters */}
      <Card className="mb-6">
        <CardContent className="p-4">
          <form
            onSubmit={(e) => {
              e.preventDefault();
              submitSearch();
            }}
            className="grid items-center gap-3 md:grid-cols-[1fr_1fr_auto]"
          >
            <div className="relative" ref={suggestRef}>
              <Search className="pointer-events-none absolute left-3 top-1/2 z-10 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                className="pl-9"
                placeholder="Job title or keyword…"
                value={keyword}
                onChange={(e) => {
                  setKeyword(e.target.value);
                  setShowSuggest(true);
                }}
                onFocus={() => setShowSuggest(true)}
              />
              {showSuggest && suggestQuery.data?.suggestions?.length > 0 && (
                <div className="absolute left-0 right-0 top-full z-30 mt-1 overflow-hidden rounded-md border border-border bg-background shadow-lg">
                  {suggestQuery.data.suggestions.map((raw, i) => {
                    // Defensive: backend returns strings, but tolerate { title } too.
                    const text = typeof raw === 'string' ? raw : raw?.title || '';
                    if (!text) return null;
                    return (
                      <button
                        key={`${text}-${i}`}
                        type="button"
                        className="block w-full px-3 py-2 text-left text-sm hover:bg-muted"
                        onClick={() => {
                          setKeyword(text);
                          submitSearch(text, location);
                        }}
                      >
                        {text}
                      </button>
                    );
                  })}
                </div>
              )}
            </div>

            <div className="relative">
              <MapPin className="pointer-events-none absolute left-3 top-1/2 z-10 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                className="pl-9"
                placeholder="Location…"
                value={location}
                onChange={(e) => setLocation(e.target.value)}
              />
            </div>

            <div className="flex items-center gap-2">
              <Button type="submit" variant="accent" disabled={listQuery.isFetching}>
                <Search className="h-4 w-4" /> Search
              </Button>
              {(submittedKeyword || submittedLocation || jobType) && (
                <Button type="button" variant="ghost" size="sm" onClick={clearSearch}>
                  Clear
                </Button>
              )}
            </div>
          </form>

          <div className="mt-3 flex flex-wrap items-center gap-1.5">
            <Filter className="ml-1 h-4 w-4 text-muted-foreground" />
            <button
              type="button"
              onClick={() => setJobType('')}
              className={cn(
                'rounded-full px-3 py-1 text-xs font-medium transition-colors',
                jobType === '' ? 'bg-accent text-accent-foreground' : 'bg-muted text-muted-foreground hover:bg-muted/80'
              )}
            >
              All
            </button>
            {JOB_TYPES.map((t) => (
              <button
                key={t}
                type="button"
                onClick={() => setJobType(t)}
                className={cn(
                  'rounded-full px-3 py-1 text-xs font-medium transition-colors',
                  jobType === t ? 'bg-accent text-accent-foreground' : 'bg-muted text-muted-foreground hover:bg-muted/80'
                )}
              >
                {t}
              </button>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Results */}
      {listQuery.isLoading ? (
        <div className="flex items-center justify-center py-20 text-muted-foreground">
          <Loader2 className="mr-2 h-5 w-5 animate-spin" /> Loading jobs…
        </div>
      ) : listQuery.isError ? (
        <Card>
          <CardContent className="p-10 text-center text-destructive">
            Failed to load jobs. Please try again.
          </CardContent>
        </Card>
      ) : jobs.length === 0 ? (
        <Card>
          <CardContent className="p-10 text-center text-muted-foreground">
            No jobs match your filters. Try clearing them.
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-3">
          {jobs.map((job) => (
            <JobCard key={job._id} job={job} />
          ))}
        </div>
      )}

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="mt-8 flex items-center justify-center gap-2">
          <Button
            variant="outline"
            size="sm"
            disabled={page <= 1 || listQuery.isFetching}
            onClick={() => setPage((p) => Math.max(1, p - 1))}
          >
            <ChevronLeft className="h-4 w-4" /> Previous
          </Button>
          <span className="text-sm text-muted-foreground">
            Page {page} of {totalPages}
          </span>
          <Button
            variant="outline"
            size="sm"
            disabled={page >= totalPages || listQuery.isFetching}
            onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
          >
            Next <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      )}
    </div>
  );
}
