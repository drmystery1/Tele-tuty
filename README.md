# Tele Tuty — Clean Integrated Rebuild

This build is intentionally not a patch over the old HTML.

## Data integrity rules
- `auth.users.id` and `profiles.id` are never changed or recreated.
- Requested By = `jobs.created_by`.
- Approved Engineer = `jobs.approved_by`.
- Completed By = the technician on the latest assignment for that job whose status is `completed`.
- Overall Total Jobs / Completed / Pending / Not Completed are counted from unique `jobs` rows.
- Technician performance is counted from `job_assignments` for that technician.
- Directory reads only `telephone_directory`; it contains no job counters.
- Job list, reports and service requests use the same profile-name mapping.

## Included
- Login/Auth
- Dashboard
- Jobs
- Service Requests
- Technician performance
- Telephone Directory
- Reports / browser PDF printing
- Maintenance summary (Battery / Earth Pit / Street Light)
- Notifications
- Clean dark/high-definition visual system
- Supplied image references in `assets/`

## Deployment
Upload the whole folder to the GitHub/Vercel project. Do not merge individual snippets into the old `index.html`.
