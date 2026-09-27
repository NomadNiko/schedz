# Schedz

A tablet-first staff scheduling app for restaurants. Managers build each
week's schedule on an iPad by dragging positions onto days; staff see the
published schedule on a PIN-protected page they're sent a link to.

API: [NomadNiko/schedz-server](https://github.com/NomadNiko/schedz-server)

Built on [brocoders/extensive-react-boilerplate](https://github.com/brocoders/extensive-react-boilerplate)
(Next.js 15, React 19, MUI 7, React Query). Sign-in, profile and user
management come from the boilerplate; the Schedule, Staff and Positions
admin pages and the public schedule page are Schedz.

## Features

### Schedule builder (Admin → Schedule)

Designed for iPads: the whole Monday-to-Sunday week fits on screen in both
landscape and portrait, and every control is a comfortable tap target.

- **Add a shift:** drag a position chip onto a day, or tap a position and
  then tap one or more days, or use **+ Add** on a day. The shift form opens
  with that position and day and 10:00 AM – 4:00 PM filled in.
- **Shift form:** position, day, start and end in 15-minute steps (12-hour
  AM/PM; an end before the start is an overnight shift), staff, and a note.
  The staff field is searchable and lists **suggested** staff (those who
  have the position) first. Leave it empty for an **open** shift. It warns
  when someone already has an overlapping shift.
- **Tap a shift** for a pop-up card with its full details and **Edit**,
  **Duplicate** (an exact copy, left open) and **Delete**, each with a small
  confirmation.
- **Press and hold a shift, then drag** to move it to another day.
- **Weeks:** start a week blank or by copying one of the most recent
  published weeks. Every change saves to the week's draft straight away.
  **Publish** makes the draft visible to staff; after that, edits show as
  *Unpublished changes* until you **Republish**, or you can **Discard
  changes** to go back to what was published.

### Staff and Positions (Admin → Staff, Admin → Positions)

- **Staff:** one name field (full name, first name or nickname), optional
  email and phone, and the positions they work, shown as tap-to-toggle chips.
  Putting someone on a shift adds that position to their list
  automatically, and it can be removed again here.
- **Positions:** a name and a colour. The list shows which staff have each
  position.
- Both are **archived** instead of deleted, so past schedules stay intact.

### Staff schedule page (`/schedule`)

- Shared by direct link; only admins see it in the menu. Not indexed by
  search engines.
- Protected by a PIN (set on the API), remembered on each device.
- Shows published weeks only, with full history, a week at a time listed day
  by day; **Show shifts for** filters to one person and is remembered on the
  device.

## Setup

```bash
npm ci
cp example.env.local .env.local   # set NEXT_PUBLIC_API_URL to your API
npm run dev                       # development
npm run build && npm run start    # production
```

Requires Node.js 20+ and a running Schedz API.

### Settings (`.env.local`)

| Setting | Purpose |
|---|---|
| `NEXT_PUBLIC_API_URL` | The Schedz API, including `/api`, e.g. `https://api.example.com/api`. Baked in at build time, so rebuild after changing it. |
| `NEXT_PUBLIC_IS_SIGN_UP_ENABLED` | Public sign-up. Off for Schedz: admins are created in the admin panel. |
| `NEXT_PUBLIC_IS_GOOGLE_AUTH_ENABLED`, `NEXT_PUBLIC_IS_FACEBOOK_AUTH_ENABLED` | Social sign-in, off by default. |

## Deploying (pm2)

```bash
pm2 stop schedz
npm run build
pm2 restart schedz
```

`next start` ignores `PORT` in `.env.local`, so pass the port when creating
the pm2 process: `pm2 start npm --name schedz -- start -- -p 3000`.

## Project layout

```
src/app/[language]/
├── admin-panel/
│   ├── schedule/     the week builder
│   │   ├── page-content.tsx       page: week navigation, palette, grid
│   │   ├── week-grid.tsx          seven day columns (drop targets)
│   │   ├── shift-card.tsx         a shift in a day column
│   │   ├── shift-popover.tsx      tapped-shift card: Edit / Duplicate / Delete
│   │   ├── shift-dialog.tsx       create/edit shift form
│   │   ├── staff-picker.tsx       searchable staff field with suggestions
│   │   ├── start-week-panel.tsx   start blank or copy a published week
│   │   ├── week-actions.tsx       Publish / Republish / Discard changes
│   │   ├── use-day-drag.ts        drag onto a day (pointer events, touch + mouse)
│   │   ├── use-shift-actions.ts   move / duplicate / delete
│   │   └── week-utils.ts          text-date helpers (Monday weeks, 12-hour times)
│   ├── staff/  positions/  users/
└── schedule/         public staff schedule page
```

Drag and drop is built on browser pointer events rather than a library, so
the same code handles touch and mouse. Dates are handled as
`"YYYY-MM-DD"` text and times as `"HH:mm"`, the same as the API, so a date
never shifts with the device's time zone.

## License

MIT. See [LICENSE](LICENSE).
