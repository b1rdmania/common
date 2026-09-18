import React, {
  useState,
  useEffect,
  useMemo,
  useCallback,
  useRef,
  createContext,
  useContext,
} from 'react';
import { createRoot } from 'react-dom/client';
import {
  BrowserRouter,
  Routes,
  Route,
  Link,
  NavLink,
  useNavigate,
  useParams,
  useLocation,
} from 'react-router-dom';
import {
  ArrowUpRight,
  ArrowRight,
  ArrowLeft,
  MapPin,
  CalendarDays,
  Clock,
  Users,
  Plus,
  Search,
  SlidersHorizontal,
  Check,
  Copy,
  X,
  Leaf,
  Utensils,
  HandHeart,
  BookOpen,
  Building2,
  LogOut,
  Mail,
  ChevronRight,
  Accessibility,
  ExternalLink,
  CheckCircle2,
  Info,
  LoaderCircle,
} from 'lucide-react';
import { createAuthClient } from 'better-auth/react';
import '@fontsource-variable/manrope';
import '@fontsource-variable/dm-sans';
import './styles.css';
import { demoActivities, demoHosts } from './demo-content';

const authClient = createAuthClient();
const Context = createContext(null);
const useApp = () => useContext(Context);
let timezone = 'Europe/London';
const date = (
  value,
  options = { weekday: 'short', day: 'numeric', month: 'short' },
) =>
  new Intl.DateTimeFormat('en-GB', { timeZone: timezone, ...options }).format(
    new Date(value),
  );
const time = (value) => date(value, { hour: 'numeric', minute: '2-digit' });
const duration = (s) => {
  const minutes = (new Date(s.ends_at) - new Date(s.starts_at)) / 60000;
  return `${Math.floor(minutes / 60) ? `${Math.floor(minutes / 60)}h` : ''}${minutes % 60 ? ` ${minutes % 60}m` : ''}`.trim();
};
const future = (s) => new Date(s.starts_at) > new Date();
const categoryStyle = (c) =>
  c === 'Outdoors'
    ? 'green'
    : c === 'Food & community'
      ? 'orange'
      : c === 'Mentoring'
        ? 'purple'
        : 'blue';
const CategoryIcon = ({ category, ...props }) => {
  const Icon =
    category === 'Outdoors'
      ? Leaf
      : category === 'Food & community'
        ? Utensils
        : category === 'Mentoring'
          ? BookOpen
          : HandHeart;
  return <Icon {...props} />;
};
function ActivityArtwork({ session, detail = false }) {
  const { config } = useApp();
  const photo = config.demo ? demoActivities[session.title] : null;
  const [failed, setFailed] = useState(false);
  useEffect(() => setFailed(false), [photo?.src]);
  const hasPhoto = photo && !failed;
  return (
    <>
      <div
        className={`${detail ? 'detail-banner' : 'card-art'} ${categoryStyle(session.category)} ${hasPhoto ? 'photo-art' : ''}`}
      >
        {hasPhoto && (
          <img
            className="activity-photo"
            src={photo.src}
            alt={photo.alt}
            style={{ objectPosition: photo.position || 'center' }}
            loading={detail ? 'eager' : 'lazy'}
            decoding="async"
            onError={() => setFailed(true)}
          />
        )}
        <span className="card-category">
          <CategoryIcon category={session.category} size={15} />
          {session.category}
        </span>
        {hasPhoto && <span className="stock-label">Stock photo</span>}
        {detail ? (
          <span className="photo-area">{session.area}</span>
        ) : (
          <div className="card-date">
            <span>{date(session.starts_at, { weekday: 'long' })}</span>
            <strong>
              {date(session.starts_at, { day: '2-digit' })}
              <span>{date(session.starts_at, { month: 'short' })}</span>
            </strong>
          </div>
        )}
        {!hasPhoto && (
          <CategoryIcon
            category={session.category}
            className="activity-symbol"
            strokeWidth={1.3}
          />
        )}
        {!hasPhoto && !detail && (
          <span className="art-caption">A little time, well spent.</span>
        )}
      </div>
      {detail && hasPhoto && (
        <p className="photo-credit">
          Illustrative photo ·{' '}
          <a href={photo.source} target="_blank" rel="noopener noreferrer">
            {photo.photographer} / Pexels
          </a>
        </p>
      )}
    </>
  );
}
function DemoHost({ organisation }) {
  const { config } = useApp();
  const host = config.demo ? demoHosts[organisation] : null;
  if (!host) return null;
  return (
    <section className="demo-host" aria-label="Your host">
      <span className={`host-initials ${host.colour}`} aria-hidden="true">
        {host.name
          .split(' ')
          .map((n) => n[0])
          .join('')}
      </span>
      <div>
        <span className="eyebrow">YOUR HOST · FICTIONAL DEMO</span>
        <h2>{host.name}</h2>
        <span className="host-role">{host.role}</span>
        <p>{host.intro}</p>
      </div>
    </section>
  );
}
async function api(path, options = {}) {
  const response = await fetch(`/api${path}`, {
    ...options,
    headers: { 'Content-Type': 'application/json', ...options.headers },
  });
  const data = await response.json();
  if (!response.ok)
    throw new Error(data.error || 'Something went wrong. Please try again.');
  return data;
}
const post = (path, body = {}) =>
  api(path, { method: 'POST', body: JSON.stringify(body) });
function useData(path) {
  const [data, setData] = useState(null),
    [error, setError] = useState(''),
    [version, setVersion] = useState(0);
  const reload = useCallback(() => setVersion((v) => v + 1), []);
  useEffect(() => {
    let active = true;
    setError('');
    setData(null);
    if (path)
      api(path)
        .then((v) => active && setData(v))
        .catch((e) => active && setError(e.message));
    return () => {
      active = false;
    };
  }, [path, version]);
  return { data, error, reload };
}
function ErrorMessage({ children }) {
  return children ? (
    <div className="error" role="alert">
      {children}
    </div>
  ) : null;
}
function Loading() {
  return (
    <div className="loading" role="status">
      <LoaderCircle className="spin" size={22} /> Loading…
    </div>
  );
}
function Empty({ title, children, action }) {
  return (
    <div className="empty">
      <HandHeart size={30} />
      <h2>{title}</h2>
      <p>{children}</p>
      {action}
    </div>
  );
}
function Badge({ status }) {
  return (
    <span className={`badge status-${status}`}>
      {{
        pending: 'Awaiting approval',
        accepted: 'Confirmed',
        declined: 'Not accepted',
        withdrawn: 'Withdrawn',
        cancelled: 'Cancelled',
        published: 'Open',
      }[status] || status}
    </span>
  );
}
function Button({ busy, children, ...props }) {
  return (
    <button {...props} disabled={busy || props.disabled}>
      {busy ? <LoaderCircle size={17} className="spin" /> : null}
      {children}
    </button>
  );
}
function Field({ label, hint, children }) {
  return (
    <label className="field">
      <span>{label}</span>
      {children}
      {hint && <small>{hint}</small>}
    </label>
  );
}
function Modal({ title, onClose, children }) {
  const ref = useRef();
  useEffect(() => {
    const d = ref.current;
    d.showModal();
    const handler = (e) => {
      e.preventDefault();
      onClose();
    };
    d.addEventListener('cancel', handler);
    return () => {
      d.removeEventListener('cancel', handler);
      d.close();
    };
  }, []);
  return (
    <dialog
      ref={ref}
      aria-labelledby="modal-title"
      onClick={(e) => {
        if (e.target === ref.current) onClose();
      }}
    >
      <div className="modal-inner">
        <div className="modal-head">
          <h2 id="modal-title">{title}</h2>
          <button
            className="icon-button"
            aria-label="Close dialog"
            onClick={onClose}
          >
            <X />
          </button>
        </div>
        {children}
      </div>
    </dialog>
  );
}
function Share({ session, onClose }) {
  const [copied, setCopied] = useState(false),
    [error, setError] = useState('');
  const url = `${window.location.origin}/opportunities/${session.id}`;
  return (
    <Modal title="Better with your people." onClose={onClose}>
      <p>Send this session to a friend, your old team or the group chat.</p>
      <div className="share-preview">
        <CategoryIcon category={session.category} />
        <div>
          <strong>{session.title}</strong>
          <small>
            {date(session.starts_at)} · {time(session.starts_at)} ·{' '}
            {session.area}
          </small>
        </div>
      </div>
      <Field label="Session link">
        <input readOnly value={url} onFocus={(e) => e.target.select()} />
      </Field>
      <Button
        className="button primary full"
        onClick={async () => {
          try {
            await navigator.clipboard.writeText(url);
            setCopied(true);
          } catch {
            setError('Select the link above and copy it manually.');
          }
        }}
      >
        {copied ? <Check size={18} /> : <Copy size={18} />}{' '}
        {copied ? 'Link copied' : 'Copy invitation link'}
      </Button>
      {navigator.share && (
        <button
          className="button secondary full"
          onClick={() =>
            navigator
              .share({
                title: session.title,
                text: 'Fancy doing something useful together?',
                url,
              })
              .catch(() => {})
          }
        >
          Share with an app <ArrowUpRight size={17} />
        </button>
      )}
      <ErrorMessage>{error}</ErrorMessage>
      <p className="small muted">
        Everyone requests their own place. Sharing a link doesn’t reserve spaces
        for the group.
      </p>
    </Modal>
  );
}
function Shell() {
  const { config, me, refresh } = useApp();
  const [menu, setMenu] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();
  useEffect(() => {
    setMenu(false);
    window.scrollTo(0, 0);
  }, [location.pathname]);
  return (
    <>
      <a className="skip" href="#main">
        Skip to content
      </a>
      {config.demo && (
        <div className="demo-banner">
          <span>LOCAL DEMO</span> Fictional opportunities. Try it as a volunteer
          or a host.
          <Link to="/signin">
            Switch role <ArrowUpRight size={13} />
          </Link>
        </div>
      )}
      <header className="header">
        <div className="header-inner">
          <Link to="/" className="brand" aria-label={`${config.name} home`}>
            <img src="/favicon.svg" width="33" height="33" alt="" />
            {config.name}
            <span className="brand-label">volunteer together</span>
          </Link>
          <nav aria-label="Main navigation">
            <NavLink to="/" end>
              Explore
            </NavLink>
            {me && <NavLink to="/plans">My plans</NavLink>}
            <NavLink to="/host">Find volunteers</NavLink>
          </nav>
          {me ? (
            <div className="account">
              <button
                className="avatar"
                onClick={() => setMenu(!menu)}
                aria-expanded={menu}
                aria-label="Account menu"
              >
                {me.user.name
                  .split(' ')
                  .map((x) => x[0])
                  .slice(0, 2)
                  .join('')}
              </button>
              {menu && (
                <div className="account-menu">
                  <strong>{me.user.name}</strong>
                  <small>{me.user.email}</small>
                  <button
                    onClick={async () => {
                      await authClient.signOut();
                      await refresh();
                      navigate('/');
                    }}
                  >
                    <LogOut size={16} /> Sign out
                  </button>
                </div>
              )}
            </div>
          ) : (
            <Link className="button small-button primary" to="/signin">
              Sign in <ArrowUpRight size={15} />
            </Link>
          )}
        </div>
      </header>
      <main id="main">
        <Routes>
          <Route path="/" element={<Explore />} />
          <Route path="/opportunities/:id" element={<Detail />} />
          <Route path="/signin" element={<SignIn />} />
          <Route
            path="/plans"
            element={
              <Protected>
                <Plans />
              </Protected>
            }
          />
          <Route path="/host" element={<HostLanding />} />
          <Route
            path="/host/new"
            element={
              <Protected>
                <NewSession />
              </Protected>
            }
          />
          <Route
            path="/host/sessions/:id/edit"
            element={
              <Protected>
                <NewSession />
              </Protected>
            }
          />
          <Route
            path="/host/register"
            element={
              <Protected>
                <NewOrganisation />
              </Protected>
            }
          />
          <Route
            path="/join-team/:token"
            element={
              <Protected>
                <JoinTeam />
              </Protected>
            }
          />
          <Route
            path="*"
            element={
              <Empty
                title="This page has wandered off."
                action={
                  <Link className="button primary" to="/">
                    Explore opportunities
                  </Link>
                }
              >
                The link may have changed.
              </Empty>
            }
          />
        </Routes>
      </main>
      <footer>
        <Link className="footer-brand" to="/">
          {config.name}
          <span>Small acts. Shared company.</span>
        </Link>
        <span>Built to belong to everyone. Open source · MIT</span>
        <span>{config.city}</span>
      </footer>
    </>
  );
}
function Protected({ children }) {
  const { me } = useApp();
  const location = useLocation();
  return me ? (
    children
  ) : (
    <div className="narrow page">
      <Empty
        title="A little introduction first."
        action={
          <Link
            className="button primary"
            to={`/signin?next=${encodeURIComponent(location.pathname)}`}
          >
            Sign in to continue <ArrowRight size={17} />
          </Link>
        }
      >
        Create your account to request places and organise volunteering.
      </Empty>
    </div>
  );
}
function Explore() {
  const { config } = useApp();
  const { data, error, reload } = useData('/sessions');
  const [q, setQ] = useState(''),
    [category, setCategory] = useState('All activities'),
    [when, setWhen] = useState('any'),
    [people, setPeople] = useState('1'),
    [share, setShare] = useState(null);
  const filtered = useMemo(
    () =>
      data?.filter((s) => {
        const matches = `${s.title} ${s.area} ${s.organisation_name}`
          .toLowerCase()
          .includes(q.toLowerCase());
        const now = new Date(),
          start = new Date(s.starts_at),
          days = (start - now) / 86400000;
        const weekend = date(s.starts_at, { weekday: 'short' });
        const dateMatch =
          when === 'any' ||
          (when === 'week' && days <= 7) ||
          (when === 'weekend' && days <= 7 && ['Sat', 'Sun'].includes(weekend));
        return (
          matches &&
          (category === 'All activities' || s.category === category) &&
          dateMatch &&
          s.places_left >= Number(people)
        );
      }) || [],
    [data, q, category, when, people],
  );
  return (
    <div className="page">
      <section className="intro">
        <div>
          <div className="eyebrow">
            <MapPin size={14} />
            {config.city.toUpperCase()}
          </div>
          <h1>
            Get out.
            <br />
            Do some good.
          </h1>
          <p>
            A few hours, a few good people.
            <br className="mobile-only" /> Find something useful to do together.
          </p>
        </div>
        <div className="intro-note">
          <span className="note-line">Less screen time.</span>
          <span className="note-line">More real life.</span>
          <Link to="/host">
            Have something that needs doing? <ArrowUpRight size={16} />
          </Link>
        </div>
      </section>
      <section aria-label="Find opportunities">
        <div className="search-bar">
          <label className="search-field">
            <Search size={20} />
            <input
              aria-label="Search opportunities or neighbourhoods"
              placeholder="An activity or neighbourhood…"
              value={q}
              onChange={(e) => setQ(e.target.value)}
            />
          </label>
          <label className="filter-field">
            <CalendarDays size={19} />
            <select
              aria-label="When"
              value={when}
              onChange={(e) => setWhen(e.target.value)}
            >
              <option value="any">Any time</option>
              <option value="week">Next 7 days</option>
              <option value="weekend">This weekend</option>
            </select>
          </label>
          <label className="filter-field">
            <Users size={19} />
            <select
              aria-label="Places available"
              value={people}
              onChange={(e) => setPeople(e.target.value)}
            >
              <option value="1">Just me</option>
              <option value="2">2+ places</option>
              <option value="4">4+ places</option>
              <option value="6">6+ places</option>
            </select>
          </label>
        </div>
        <div className="categories" aria-label="Activity categories">
          {['All activities', ...config.categories].map((c) => (
            <button
              key={c}
              className={`category-chip ${category === c ? 'active' : ''}`}
              aria-pressed={category === c}
              onClick={() => setCategory(c)}
            >
              {c !== 'All activities' && (
                <CategoryIcon category={c} size={16} />
              )}{' '}
              {c}
            </button>
          ))}
        </div>
      </section>
      <div className="section-heading">
        <h2>Find your next good thing</h2>
        <span>
          {data
            ? `${filtered.length} ${filtered.length === 1 ? 'opportunity' : 'opportunities'}`
            : 'Loading opportunities'}
        </span>
      </div>
      <ErrorMessage>{error}</ErrorMessage>
      {error && (
        <button className="button secondary" onClick={reload}>
          Try again
        </button>
      )}
      {!data && !error ? (
        <Loading />
      ) : filtered.length ? (
        <div className="opportunity-grid">
          {filtered.map((s, index) => (
            <article className="opportunity-card" key={s.id}>
              <ActivityArtwork session={s} />
              <div className="card-body">
                <div className="card-meta">
                  <span>
                    <MapPin size={14} />
                    {s.area}
                  </span>
                  <span>{duration(s)}</span>
                </div>
                <h3>
                  <Link to={`/opportunities/${s.id}`}>{s.title}</Link>
                </h3>
                <p className="host-name">With {s.organisation_name}</p>
                <div className="card-bottom">
                  <span>
                    <Users size={15} />
                    {s.places_left} places available
                  </span>
                  <button
                    className="icon-button"
                    onClick={() => setShare(s)}
                    aria-label={`Invite friends to ${s.title}`}
                  >
                    <ArrowUpRight size={20} />
                  </button>
                </div>
              </div>
            </article>
          ))}
        </div>
      ) : (
        data && (
          <Empty
            title="Nothing here just yet."
            action={
              <button
                className="button secondary"
                onClick={() => {
                  setQ('');
                  setWhen('any');
                  setPeople('1');
                  setCategory('All activities');
                }}
              >
                Clear filters
              </button>
            }
          >
            Try another neighbourhood, date or group size.
          </Empty>
        )
      )}
      <div className="host-strip">
        <div>
          <Building2 size={25} />
          <div>
            <strong>Good things need good people.</strong>
            <p>
              Make room for a few more hands. List a session for your
              organisation.
            </p>
          </div>
        </div>
        <Link to="/host" className="button secondary">
          Find volunteers <ArrowUpRight size={17} />
        </Link>
      </div>
      {share && <Share session={share} onClose={() => setShare(null)} />}
    </div>
  );
}
function Detail() {
  const { id } = useParams();
  const { data: s, error, reload } = useData(`/sessions/${id}`);
  const { me, config } = useApp();
  const plans = useData(me ? '/plans' : null);
  const [share, setShare] = useState(false),
    [note, setNote] = useState(''),
    [ack, setAck] = useState(false),
    [busy, setBusy] = useState(false),
    [actionError, setActionError] = useState('');
  const application = plans.data?.find((a) => a.session_id === id);
  if (error)
    return (
      <div className="page">
        <ErrorMessage>{error}</ErrorMessage>
        <Link to="/">Back to opportunities</Link>
      </div>
    );
  if (!s) return <Loading />;
  const request = async (e) => {
    e.preventDefault();
    setBusy(true);
    setActionError('');
    try {
      await post(`/sessions/${id}/apply`, { note, acknowledged: ack });
      plans.reload();
      reload();
    } catch (e) {
      setActionError(e.message);
    } finally {
      setBusy(false);
    }
  };
  const closed = s.status === 'cancelled' || !future(s);
  const manages = me?.organisations.some((o) => o.id === s.organisation_id);
  const active = application && application.status !== 'withdrawn';
  return (
    <div className="page detail-page">
      <Link className="back-link" to="/">
        <ArrowLeft size={16} /> All opportunities
      </Link>
      <div className="detail-layout">
        <div>
          <ActivityArtwork session={s} detail />
          <div className="eyebrow detail-eyebrow">
            WITH {s.organisation_name.toUpperCase()}
          </div>
          <h1 className="detail-title">{s.title}</h1>
          <div className="detail-facts">
            <span>
              <MapPin size={17} />
              {s.area}
            </span>
            <span>
              <Clock size={17} />
              {duration(s)}
            </span>
            <span>
              <Users size={17} />
              Up to {s.capacity} people
            </span>
          </div>
          <DemoHost organisation={s.organisation_name} />
          <section className="prose-section">
            <h2>What you’ll be doing</h2>
            {s.description
              .split('\n')
              .filter(Boolean)
              .map((p, i) => (
                <p key={i}>{p}</p>
              ))}
          </section>
          <section className="prose-section">
            <h2>Before you come</h2>
            <p>{s.requirements}</p>
            <p className="muted">
              This session is for adults aged 18 and over. The host reviews each
              request.
            </p>
          </section>
          <section className="prose-section">
            <h2>
              <Accessibility size={21} /> Access & getting here
            </h2>
            <p>
              {s.accessibility ||
                'Ask the host about any access needs in your request.'}
            </p>
            <p>
              <MapPin size={17} /> {s.address}
            </p>
          </section>
          <section className="host-about">
            <div className="organisation-icon">
              <Building2 />
            </div>
            <div>
              <h2>{s.organisation_name}</h2>
              <p>{s.organisation_description}</p>
              {s.organisation_website && (
                <a
                  href={s.organisation_website}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  Visit website <ExternalLink size={14} />
                </a>
              )}
            </div>
          </section>
        </div>
        <aside>
          <div className="booking-panel">
            <div className="booking-date">
              <CalendarDays size={23} />
              <div>
                <strong>
                  {date(s.starts_at, {
                    weekday: 'long',
                    day: 'numeric',
                    month: 'long',
                  })}
                </strong>
                <span>
                  {time(s.starts_at)}–{time(s.ends_at)} · {duration(s)}
                </span>
              </div>
            </div>
            <span className="timezone">Times shown in {config.timezone}</span>
            <div className="booking-places">
              <span>
                {closed
                  ? 'Session unavailable'
                  : `${s.places_left} places available`}
              </span>
              <strong>Free</strong>
            </div>
            {closed ? (
              <div className="notice">
                {s.status === 'cancelled'
                  ? 'The host has cancelled this session.'
                  : 'This session has already started.'}
              </div>
            ) : manages ? (
              <div className="application-status">
                <h3>You’re hosting this one.</h3>
                <p>Welcome people in and keep your session up to date.</p>
                <Link className="button primary full" to="/host">
                  Manage requests <ArrowRight size={16} />
                </Link>
                <Link
                  className="button secondary full"
                  to={`/host/sessions/${s.id}/edit`}
                >
                  Edit session
                </Link>
              </div>
            ) : active ? (
              <div className="application-status">
                <Badge status={application.status} />
                <h3>
                  {application.status === 'accepted'
                    ? 'You’re going.'
                    : application.status === 'pending'
                      ? 'Your request is with the host.'
                      : 'The host couldn’t offer a place.'}
                </h3>
                <p>
                  {application.status === 'accepted'
                    ? 'Read the preparation details before you come. See you there!'
                    : application.status === 'pending'
                      ? 'Your place is confirmed when the host accepts. You can check back in My plans.'
                      : 'There are other ways to get involved. Browse another session.'}
                </p>
                <Link className="button primary full" to="/plans">
                  View my plans <ArrowRight size={16} />
                </Link>
              </div>
            ) : s.places_left === 0 ? (
              <div className="notice">
                This session is full. Explore another date.
              </div>
            ) : !me ? (
              <>
                <Link
                  className="button primary full"
                  to={`/signin?next=${encodeURIComponent(`/opportunities/${id}`)}`}
                >
                  Request a place <ArrowRight size={17} />
                </Link>
                <p className="small muted">
                  Sign in, introduce yourself, and the host will confirm your
                  place.
                </p>
              </>
            ) : !plans.data ? (
              <Loading />
            ) : (
              <form onSubmit={request}>
                <Field
                  label="A quick hello to the host"
                  hint="Optional. Mention anyone you’re coming with or any access needs."
                >
                  <textarea
                    rows={3}
                    maxLength={1500}
                    value={note}
                    onChange={(e) => setNote(e.target.value)}
                    placeholder="Hi! I’d love to come along…"
                  />
                </Field>
                <label className="check-field">
                  <input
                    type="checkbox"
                    required
                    checked={ack}
                    onChange={(e) => setAck(e.target.checked)}
                  />
                  <span>
                    I’m 18 or over and have read the preparation details.
                  </span>
                </label>
                <Button
                  busy={busy}
                  className="button primary full"
                  type="submit"
                >
                  Request a place <ArrowRight size={17} />
                </Button>
                <p className="small muted">
                  The host approves requests. This doesn’t reserve a place yet.
                </p>
              </form>
            )}
            <ErrorMessage>{actionError || plans.error}</ErrorMessage>
            <button
              className="button secondary full"
              onClick={() => setShare(true)}
            >
              <Users size={17} /> Invite friends
            </button>
            <a className="calendar-link" href={`/api/sessions/${id}/calendar`}>
              <CalendarDays size={15} /> Add to calendar
            </a>
          </div>
          <p className="booking-footnote">
            Come as you are. Everyone starts somewhere.
          </p>
        </aside>
      </div>
      {share && <Share session={s} onClose={() => setShare(false)} />}
    </div>
  );
}
function SignIn() {
  const { config, me, refresh } = useApp();
  const navigate = useNavigate();
  const location = useLocation();
  const raw = new URLSearchParams(location.search).get('next');
  const next =
    raw?.startsWith('/') && !raw.startsWith('//') && !raw.includes('\\')
      ? raw
      : '/plans';
  const [busy, setBusy] = useState(''),
    [error, setError] = useState('');
  async function demoLogin(role) {
    setBusy(role);
    setError('');
    try {
      await post('/demo/sign-in', { role });
      await refresh();
      navigate(raw ? next : role === 'host' ? '/host' : '/');
    } catch (e) {
      setError(e.message);
    } finally {
      setBusy('');
    }
  }
  return (
    <div className="auth-page">
      <div className="auth-card">
        <div className="eyebrow">A LITTLE INTRODUCTION</div>
        <h1>
          Good to
          <br />
          have you here.
        </h1>
        <p>
          Find your people. Lend a hand.
          <br />
          One account for volunteering and hosting.
        </p>
        {config.google ? (
          <Button
            busy={busy === 'google'}
            className="button google-button full"
            onClick={async () => {
              setBusy('google');
              setError('');
              try {
                const result = await authClient.signIn.social({
                  provider: 'google',
                  callbackURL: next,
                });
                if (result.error) throw new Error(result.error.message);
              } catch (e) {
                setError(e.message);
                setBusy('');
              }
            }}
          >
            <span className="google-g">G</span> Continue with Google
          </Button>
        ) : (
          <div className="notice">
            Google sign-in hasn’t been connected on this installation yet.
            {!config.demo &&
              ' The site operator needs to add Google credentials.'}
          </div>
        )}
        {config.demo && (
          <div className="demo-accounts">
            <span className="eyebrow">TRY THE LOCAL DEMO</span>
            <button
              disabled={!!busy}
              className="demo-account"
              onClick={() => demoLogin('volunteer')}
            >
              <span className="avatar">AM</span>
              <div>
                <strong>Explore as Alex</strong>
                <small>Request a place and invite friends</small>
              </div>
              {busy === 'volunteer' ? (
                <LoaderCircle className="spin" size={20} />
              ) : (
                <ArrowRight size={20} />
              )}
            </button>
            <button
              disabled={!!busy}
              className="demo-account"
              onClick={() => demoLogin('host')}
            >
              <span className="avatar host-avatar">CT</span>
              <div>
                <strong>Host as Charlie</strong>
                <small>Publish sessions and accept requests</small>
              </div>
              {busy === 'host' ? (
                <LoaderCircle className="spin" size={20} />
              ) : (
                <ArrowRight size={20} />
              )}
            </button>
          </div>
        )}
        <ErrorMessage>{error}</ErrorMessage>
        {me && (
          <Link className="text-link" to={next}>
            Continue as {me.user.name} <ArrowRight size={16} />
          </Link>
        )}
        <p className="small muted">
          Your name and email are shared with a host when you request a place.
          You must be 18 or over to participate.
        </p>
        <Link className="back-link" to="/">
          <ArrowLeft size={16} /> Keep browsing
        </Link>
      </div>
      <div className="auth-side">
        <span>
          Make a little
          <br />
          time for
          <br />
          <em>something good.</em>
        </span>
        <p>
          No perfect skills.
          <br />
          No big speech.
          <br />
          Just you, showing up.
        </p>
      </div>
    </div>
  );
}
function Plans() {
  const { data, error, reload } = useData('/plans');
  const [share, setShare] = useState(null),
    [cancel, setCancel] = useState(null),
    [busy, setBusy] = useState(false),
    [actionError, setActionError] = useState('');
  return (
    <div className="page">
      <div className="page-heading">
        <div>
          <div className="eyebrow">YOUR NEXT FEW GOOD THINGS</div>
          <h1>My plans</h1>
          <p>Requests, confirmations and the people you’re helping.</p>
        </div>
        <Link className="button secondary" to="/">
          Find something else <Plus size={17} />
        </Link>
      </div>
      <ErrorMessage>{error || actionError}</ErrorMessage>
      {!data && !error ? (
        <Loading />
      ) : data?.length ? (
        <div className="plan-list">
          {data.map((a) => (
            <article className="plan-row" key={a.id}>
              <div className={`date-tile ${categoryStyle(a.session.category)}`}>
                <span>{date(a.session.starts_at, { month: 'short' })}</span>
                <strong>{date(a.session.starts_at, { day: '2-digit' })}</strong>
              </div>
              <div className="plan-info">
                <Badge
                  status={
                    a.session.status === 'cancelled' ? 'cancelled' : a.status
                  }
                />
                <h2>
                  <Link to={`/opportunities/${a.session_id}`}>
                    {a.session.title}
                  </Link>
                </h2>
                <p>
                  {date(a.session.starts_at)} · {time(a.session.starts_at)} ·{' '}
                  {a.session.area}
                </p>
              </div>
              <div className="plan-actions">
                <button
                  className="button secondary"
                  onClick={() => setShare(a.session)}
                >
                  Invite friends <ArrowUpRight size={16} />
                </button>
                {['pending', 'accepted'].includes(a.status) &&
                  a.session.status !== 'cancelled' &&
                  future(a.session) && (
                    <button
                      className="text-button muted"
                      onClick={() => {
                        setActionError('');
                        setCancel(a);
                      }}
                    >
                      Withdraw request
                    </button>
                  )}
              </div>
            </article>
          ))}
        </div>
      ) : (
        data && (
          <Empty
            title="Your next good thing is out there."
            action={
              <Link className="button primary" to="/">
                Explore opportunities <ArrowRight size={17} />
              </Link>
            }
          >
            Find a session that fits your week and request a place.
          </Empty>
        )
      )}
      {share && <Share session={share} onClose={() => setShare(null)} />}
      {cancel && (
        <Modal title="Can’t make it?" onClose={() => !busy && setCancel(null)}>
          <p>
            Withdraw from <strong>{cancel.session.title}</strong>? Letting the
            host know frees the place for someone else.
          </p>
          <ErrorMessage>{actionError}</ErrorMessage>
          <Button
            busy={busy}
            className="button danger full"
            onClick={async () => {
              setBusy(true);
              try {
                await post(`/applications/${cancel.id}/withdraw`);
                setCancel(null);
                reload();
              } catch (e) {
                setActionError(e.message);
              } finally {
                setBusy(false);
              }
            }}
          >
            Withdraw request
          </Button>
        </Modal>
      )}
    </div>
  );
}
function HostLanding() {
  const { me } = useApp();
  return me ? (
    <HostDashboard />
  ) : (
    <div className="page host-landing">
      <div className="eyebrow">FOR LOCAL ORGANISATIONS</div>
      <h1>
        A few more hands.
        <br />A lot more possible.
      </h1>
      <p>
        Tell people what needs doing, choose a date, and welcome them in. You
        decide who joins.
      </p>
      <Link className="button primary" to="/host/register">
        Register as a host <ArrowUpRight size={18} />
      </Link>
      <div className="host-steps">
        {[
          [
            '01',
            'Introduce your organisation',
            'Create a profile and add the people who help you organise.',
          ],
          [
            '02',
            'Put a session out there',
            'Say what you need, when it happens, and how many people can come.',
          ],
          [
            '03',
            'Welcome your volunteers',
            'Review requests, accept people and get ready for the day.',
          ],
        ].map(([n, t, p]) => (
          <div key={n}>
            <span>{n}</span>
            <h2>{t}</h2>
            <p>{p}</p>
          </div>
        ))}
      </div>
      <div className="notice">
        Free to use. Open source. No corporate programme required.
      </div>
    </div>
  );
}
function HostDashboard() {
  const { data, error, reload } = useData('/host');
  const { config } = useApp();
  const [org, setOrg] = useState('all'),
    [tab, setTab] = useState('requests'),
    [busy, setBusy] = useState(''),
    [actionError, setActionError] = useState(''),
    [cancel, setCancel] = useState(null),
    [invite, setInvite] = useState(null);
  const sessions =
    data?.sessions.filter((s) => org === 'all' || s.organisation_id === org) ||
    [];
  const requests =
    data?.applications.filter(
      (a) =>
        (org === 'all' || a.organisation_id === org) &&
        a.status === 'pending' &&
        sessions.some(
          (s) => s.id === a.session_id && s.status === 'published' && future(s),
        ),
    ) || [];
  const decide = async (a, status) => {
    setBusy(a.id);
    setActionError('');
    try {
      await post(`/host/applications/${a.id}/decision`, { status });
      reload();
    } catch (e) {
      setActionError(e.message);
    } finally {
      setBusy('');
    }
  };
  if (!data)
    return (
      <div className="page">
        <ErrorMessage>{error}</ErrorMessage>
        {!error && <Loading />}
      </div>
    );
  if (!data.organisations.length)
    return (
      <div className="page">
        <Empty
          title="Make room for good people."
          action={
            <Link className="button primary" to="/host/register">
              Register your organisation <Plus size={17} />
            </Link>
          }
        >
          Create your organisation’s profile, publish a session and review
          requests in one place.
        </Empty>
      </div>
    );
  return (
    <div className="page">
      <div className="page-heading">
        <div>
          <div className="eyebrow">A FEW MORE HANDS</div>
          <h1>Your host space</h1>
          <p>Keep things simple. Put your next session together.</p>
        </div>
        <Link className="button primary" to="/host/new">
          <Plus size={18} /> Create a session
        </Link>
      </div>
      <div className="host-controls">
        <label className="select-label">
          Organisation
          <select value={org} onChange={(e) => setOrg(e.target.value)}>
            <option value="all">All my organisations</option>
            {data.organisations.map((o) => (
              <option key={o.id} value={o.id}>
                {o.name}
              </option>
            ))}
          </select>
        </label>
        <Link className="text-link" to="/host/register">
          Add an organisation <Plus size={16} />
        </Link>
      </div>
      <div className="tabs" role="tablist" aria-label="Host dashboard">
        {[
          ['requests', 'Requests', requests.length],
          ['sessions', 'Sessions', sessions.length],
          ['team', 'Your team', null],
        ].map(([key, label, n]) => (
          <button
            role="tab"
            aria-selected={tab === key}
            className={tab === key ? 'active' : ''}
            key={key}
            onClick={() => setTab(key)}
          >
            {label}
            {n !== null && <span>{n}</span>}
          </button>
        ))}
      </div>
      <ErrorMessage>{actionError || error}</ErrorMessage>
      {!config.email && (
        <p className="small muted dashboard-note">
          <Info size={15} /> Email delivery is not connected. Requests and
          decisions are saved here and in volunteers’ My plans.
        </p>
      )}
      {tab === 'requests' &&
        (requests.length ? (
          <div className="request-list">
            {requests.map((a) => (
              <article className="request-card" key={a.id}>
                <span className="avatar">
                  {a.name
                    .split(' ')
                    .map((x) => x[0])
                    .slice(0, 2)
                    .join('')}
                </span>
                <div className="request-copy">
                  <h2>{a.name}</h2>
                  <p>
                    For{' '}
                    <Link to={`/opportunities/${a.session_id}`}>{a.title}</Link>
                  </p>
                  <blockquote>{a.note || 'Ready to lend a hand.'}</blockquote>
                  <small>
                    {date(
                      sessions.find((s) => s.id === a.session_id).starts_at,
                    )}{' '}
                    · {a.email}
                  </small>
                </div>
                <div className="request-actions">
                  <Button
                    busy={busy === a.id}
                    disabled={!!busy}
                    className="button primary"
                    onClick={() => decide(a, 'accepted')}
                  >
                    <Check size={17} /> Accept
                  </Button>
                  <button
                    disabled={!!busy}
                    className="text-button"
                    onClick={() => decide(a, 'declined')}
                  >
                    Decline
                  </button>
                </div>
              </article>
            ))}
          </div>
        ) : (
          <Empty title="You’re all caught up.">
            New requests will appear here when someone wants to join your
            session.
          </Empty>
        ))}
      {tab === 'sessions' &&
        (sessions.length ? (
          <div className="host-sessions">
            {sessions.map((s) => (
              <article className="host-session" key={s.id}>
                <div className="host-session-top">
                  <div>
                    <span className="eyebrow">{s.organisation_name}</span>
                    <h2>
                      <Link to={`/opportunities/${s.id}`}>{s.title}</Link>
                    </h2>
                    <p>
                      {date(s.starts_at)} · {time(s.starts_at)}–
                      {time(s.ends_at)} · {s.area}
                    </p>
                  </div>
                  <Badge
                    status={
                      s.status === 'cancelled'
                        ? 'cancelled'
                        : future(s)
                          ? 'published'
                          : 'Past session'
                    }
                  />
                </div>
                <div className="capacity">
                  <span>
                    {s.accepted_count} of {s.capacity} places confirmed
                  </span>
                  <progress
                    max={s.capacity}
                    value={s.accepted_count}
                    aria-label="Confirmed places"
                  />
                </div>
                <details>
                  <summary>
                    View people (
                    {
                      data.applications.filter(
                        (a) =>
                          a.session_id === s.id && a.status !== 'withdrawn',
                      ).length
                    }
                    )
                  </summary>
                  {data.applications
                    .filter(
                      (a) => a.session_id === s.id && a.status !== 'withdrawn',
                    )
                    .map((a) => (
                      <div className="attendee" key={a.id}>
                        <span>
                          {a.name}
                          <small>{a.email}</small>
                        </span>
                        <Badge status={a.status} />
                      </div>
                    ))}
                </details>
                <div className="host-session-bottom">
                  <Link className="text-link" to={`/opportunities/${s.id}`}>
                    View listing <ArrowUpRight size={16} />
                  </Link>
                  {s.status === 'published' && future(s) && (
                    <Link
                      className="text-link"
                      to={`/host/sessions/${s.id}/edit`}
                    >
                      Edit session
                    </Link>
                  )}
                  {s.status === 'published' && future(s) && (
                    <button
                      className="text-button muted"
                      onClick={() => {
                        setActionError('');
                        setCancel(s);
                      }}
                    >
                      Cancel session
                    </button>
                  )}
                </div>
              </article>
            ))}
          </div>
        ) : (
          <Empty
            title="Your first session starts here."
            action={
              <Link className="button primary" to="/host/new">
                Create a session
              </Link>
            }
          >
            Choose an activity, a date and the number of people you can welcome.
          </Empty>
        ))}
      {tab === 'team' && (
        <div className="team-list">
          {data.organisations
            .filter((o) => org === 'all' || o.id === org)
            .map((o) => (
              <section className="team-card" key={o.id}>
                <div className="section-heading">
                  <h2>{o.name}</h2>
                  {o.role === 'owner' && (
                    <button
                      className="button secondary"
                      onClick={() => setInvite(o)}
                    >
                      <Plus size={16} /> Invite organiser
                    </button>
                  )}
                </div>
                {data.members
                  .filter((m) => m.organisation_id === o.id)
                  .map((m) => (
                    <div className="attendee" key={m.user_id}>
                      <span>
                        {m.name}
                        <small>{m.email}</small>
                      </span>
                      <div className="member-role">
                        {m.role}
                        {o.role === 'owner' && m.role === 'organiser' && (
                          <button
                            className="text-button"
                            disabled={busy === m.user_id}
                            onClick={async () => {
                              setBusy(m.user_id);
                              try {
                                await api(
                                  `/host/organisations/${o.id}/members/${m.user_id}`,
                                  { method: 'DELETE' },
                                );
                                reload();
                              } catch (e) {
                                setActionError(e.message);
                              } finally {
                                setBusy('');
                              }
                            }}
                          >
                            Remove access
                          </button>
                        )}
                      </div>
                    </div>
                  ))}
              </section>
            ))}
        </div>
      )}
      {cancel && (
        <Modal
          title="Cancel this session?"
          onClose={() => !busy && setCancel(null)}
        >
          <p>
            <strong>{cancel.title}</strong> will stop accepting requests.
            Existing volunteers will see it as cancelled.
            {config.email
              ? ' They will also receive an email.'
              : ' Email is not connected, so please contact confirmed volunteers directly too.'}
          </p>
          <ErrorMessage>{actionError}</ErrorMessage>
          <Button
            busy={!!busy}
            className="button danger full"
            onClick={async () => {
              setBusy(cancel.id);
              try {
                await post(`/host/sessions/${cancel.id}/cancel`);
                setCancel(null);
                reload();
              } catch (e) {
                setActionError(e.message);
              } finally {
                setBusy('');
              }
            }}
          >
            Cancel session
          </Button>
        </Modal>
      )}
      {invite && (
        <InviteTeam organisation={invite} onClose={() => setInvite(null)} />
      )}
    </div>
  );
}
function InviteTeam({ organisation, onClose }) {
  const [email, setEmail] = useState(''),
    [url, setUrl] = useState(''),
    [busy, setBusy] = useState(false),
    [error, setError] = useState(''),
    [copied, setCopied] = useState(false);
  const { config } = useApp();
  return (
    <Modal title={`Invite an organiser`} onClose={onClose}>
      <p>
        They’ll be able to publish sessions and manage requests for{' '}
        <strong>{organisation.name}</strong>.
      </p>
      {url ? (
        <>
          <div className="notice success">
            Invitation created.
            {config.email
              ? ' An email has been queued.'
              : ' Share this link directly with your organiser.'}
          </div>
          <Field label="Private invitation link">
            <input readOnly value={url} onFocus={(e) => e.target.select()} />
          </Field>
          <button
            className="button primary full"
            onClick={async () => {
              try {
                await navigator.clipboard.writeText(url);
                setCopied(true);
              } catch {
                setError('Select the link above to copy it.');
              }
            }}
          >
            {copied ? 'Copied' : 'Copy link'} <Copy size={16} />
          </button>
          <p className="small muted">
            Expires in 7 days. They must sign in with {email}.
          </p>
        </>
      ) : (
        <form
          onSubmit={async (e) => {
            e.preventDefault();
            setBusy(true);
            try {
              const result = await post(
                `/host/organisations/${organisation.id}/invites`,
                { email },
              );
              setUrl(result.url);
            } catch (e) {
              setError(e.message);
            } finally {
              setBusy(false);
            }
          }}
        >
          <Field label="Their Google account email">
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </Field>
          <Button busy={busy} className="button primary full">
            Create invitation <ArrowRight size={16} />
          </Button>
        </form>
      )}
      <ErrorMessage>{error}</ErrorMessage>
    </Modal>
  );
}
function JoinTeam() {
  const { token } = useParams();
  const { refresh } = useApp();
  const navigate = useNavigate();
  const [error, setError] = useState(''),
    [busy, setBusy] = useState(false);
  return (
    <div className="narrow page">
      <h1>
        A good team
        <br />
        to be part of.
      </h1>
      <p>
        Accept your invitation to help manage an organisation. You’ll need to be
        signed in with the email address it was sent to.
      </p>
      <ErrorMessage>{error}</ErrorMessage>
      <Button
        busy={busy}
        className="button primary"
        onClick={async () => {
          setBusy(true);
          try {
            await post(`/team-invites/${token}/accept`);
            await refresh();
            navigate('/host');
          } catch (e) {
            setError(e.message);
          } finally {
            setBusy(false);
          }
        }}
      >
        Join the organisation <ArrowRight size={17} />
      </Button>
    </div>
  );
}
function NewOrganisation() {
  const { refresh } = useApp();
  const navigate = useNavigate();
  const [busy, setBusy] = useState(false),
    [error, setError] = useState('');
  return (
    <div className="page narrow">
      <Link className="back-link" to="/host">
        <ArrowLeft size={16} /> Host space
      </Link>
      <div className="eyebrow">LET’S MAKE AN INTRODUCTION</div>
      <h1>
        Your organisation,
        <br />
        in a few words.
      </h1>
      <p>
        Tell volunteers who you are. You can invite other organisers once you’re
        set up.
      </p>
      <form
        className="form-card"
        onSubmit={async (e) => {
          e.preventDefault();
          const form = new FormData(e.currentTarget);
          setBusy(true);
          setError('');
          try {
            await post('/organisations', Object.fromEntries(form));
            await refresh();
            navigate('/host/new');
          } catch (e) {
            setError(e.message);
          } finally {
            setBusy(false);
          }
        }}
      >
        <Field label="Organisation name">
          <input
            name="name"
            minLength={2}
            maxLength={100}
            required
            placeholder="The name people know you by"
          />
        </Field>
        <Field
          label="What do you do?"
          hint="A short introduction. This appears on your sessions."
        >
          <textarea
            name="description"
            minLength={20}
            maxLength={2000}
            required
            rows={4}
            placeholder="We’re a local group that…"
          />
        </Field>
        <Field label="Website (optional)">
          <input name="website" type="url" placeholder="https://" />
        </Field>
        <label className="check-field">
          <input type="checkbox" required />
          <span>
            I’m authorised to represent this organisation and organise its
            volunteer sessions.
          </span>
        </label>
        <ErrorMessage>{error}</ErrorMessage>
        <Button busy={busy} className="button primary full">
          Create organisation <ArrowRight size={17} />
        </Button>
      </form>
    </div>
  );
}
function NewSession() {
  const { id } = useParams();
  const existing = useData(id ? `/sessions/${id}` : null);
  const { me, config } = useApp();
  const navigate = useNavigate();
  const [busy, setBusy] = useState(false),
    [error, setError] = useState('');
  if (!me.organisations.length)
    return (
      <div className="page">
        <Empty
          title="First, introduce your organisation."
          action={
            <Link className="button primary" to="/host/register">
              Register as a host
            </Link>
          }
        >
          Every session needs an organisation and someone to welcome volunteers.
        </Empty>
      </div>
    );
  if (id && existing.error)
    return (
      <div className="page">
        <ErrorMessage>{existing.error}</ErrorMessage>
      </div>
    );
  if (id && !existing.data) return <Loading />;
  const session = existing.data;
  if (
    session &&
    !me.organisations.some((o) => o.id === session.organisation_id)
  )
    return (
      <div className="page">
        <ErrorMessage>
          You cannot edit this organisation’s session.
        </ErrorMessage>
      </div>
    );
  const localDate = (value) => {
    if (!value) return '';
    const d = new Date(value);
    return new Date(d.getTime() - d.getTimezoneOffset() * 60000)
      .toISOString()
      .slice(0, 16);
  };
  const deviceTimezone = Intl.DateTimeFormat().resolvedOptions().timeZone;
  return (
    <div className="page form-page">
      <Link className="back-link" to="/host">
        <ArrowLeft size={16} /> Host space
      </Link>
      <div className="page-heading">
        <div>
          <div className="eyebrow">MAKE A LITTLE ROOM</div>
          <h1>
            {id ? (
              <>
                Update the
                <br />
                good thing.
              </>
            ) : (
              <>
                Put something good
                <br />
                on the calendar.
              </>
            )}
          </h1>
          <p>
            {id
              ? 'Keep your volunteers up to date.'
              : 'A clear invitation is all it takes to get started.'}
          </p>
        </div>
      </div>
      <form
        onSubmit={async (e) => {
          e.preventDefault();
          setBusy(true);
          setError('');
          const values = Object.fromEntries(new FormData(e.currentTarget));
          try {
            const result = await api(
              id ? `/host/sessions/${id}` : '/host/sessions',
              {
                method: id ? 'PUT' : 'POST',
                body: JSON.stringify({
                  ...values,
                  organisation_id:
                    session?.organisation_id || values.organisation_id,
                  capacity: Number(values.capacity),
                  starts_at: new Date(values.starts_at).toISOString(),
                  ends_at: new Date(values.ends_at).toISOString(),
                }),
              },
            );
            navigate(`/opportunities/${result.id}`);
          } catch (e) {
            setError(e.message);
          } finally {
            setBusy(false);
          }
        }}
      >
        <div className="form-section">
          <div>
            <span className="step-number">01</span>
            <h2>The good thing</h2>
            <p>Be specific about what people will do and who they’ll help.</p>
          </div>
          <div>
            <Field label="Organisation">
              <select
                name="organisation_id"
                required
                disabled={!!id}
                defaultValue={session?.organisation_id}
              >
                {me.organisations.map((o) => (
                  <option key={o.id} value={o.id}>
                    {o.name}
                  </option>
                ))}
              </select>
            </Field>
            <Field label="Session title">
              <input
                name="title"
                defaultValue={session?.title}
                required
                minLength={5}
                maxLength={120}
                placeholder="Help prepare a neighbourhood lunch"
              />
            </Field>
            <Field label="Type of activity">
              <select name="category" defaultValue={session?.category}>
                {config.categories.map((c) => (
                  <option key={c}>{c}</option>
                ))}
              </select>
            </Field>
            <Field label="What will volunteers do?">
              <textarea
                name="description"
                defaultValue={session?.description}
                rows={5}
                required
                minLength={30}
                maxLength={5000}
                placeholder="Describe the tasks, who will welcome them, and what a typical session looks like."
              />
            </Field>
          </div>
        </div>
        <div className="form-section">
          <div>
            <span className="step-number">02</span>
            <h2>A time and a place</h2>
            <p>Set a session you can comfortably welcome people to.</p>
          </div>
          <div>
            <div className="form-columns">
              <Field label="Starts">
                <input
                  type="datetime-local"
                  name="starts_at"
                  defaultValue={localDate(session?.starts_at)}
                  required
                />
              </Field>
              <Field label="Ends">
                <input
                  type="datetime-local"
                  name="ends_at"
                  defaultValue={localDate(session?.ends_at)}
                  required
                />
              </Field>
            </div>
            <p className="small muted">
              Enter dates in your device’s timezone: {deviceTimezone}. Listings
              display in {config.timezone}.
            </p>
            <div className="form-columns">
              <Field label="Neighbourhood">
                <input
                  name="area"
                  defaultValue={session?.area}
                  required
                  minLength={2}
                  maxLength={100}
                  placeholder="Hackney"
                />
              </Field>
              <Field label="Number of places">
                <input
                  name="capacity"
                  type="number"
                  min={1}
                  max={100}
                  defaultValue={session?.capacity || 6}
                  required
                />
              </Field>
            </div>
            <Field
              label="Public meeting address"
              hint="This address is visible before sign-in. Use an appropriate public venue."
            >
              <input
                name="address"
                defaultValue={session?.address}
                required
                minLength={5}
                maxLength={250}
                placeholder="Venue, street and postcode"
              />
            </Field>
          </div>
        </div>
        <div className="form-section">
          <div>
            <span className="step-number">03</span>
            <h2>A warm welcome</h2>
            <p>
              Help someone feel comfortable coming along for the first time.
            </p>
          </div>
          <div>
            <Field
              label="What should people know or prepare?"
              hint="Include any induction, training or checks you’ll require before accepting a volunteer."
            >
              <textarea
                name="requirements"
                defaultValue={session?.requirements}
                required
                minLength={5}
                maxLength={2000}
                rows={3}
                placeholder="Wear closed-toe shoes. We’ll provide equipment and an induction when you arrive."
              />
            </Field>
            <Field label="Accessibility (optional)">
              <textarea
                name="accessibility"
                defaultValue={session?.accessibility}
                maxLength={2000}
                rows={3}
                placeholder="Step-free access, seated tasks, facilities, or how to discuss access needs."
              />
            </Field>
            <p className="small muted">
              V1 supports adults aged 18 and over. You review each request and
              arrange any role-specific checks.
            </p>
            <label className="check-field">
              <input type="checkbox" required />
              <span>
                I’ve checked these details and our organisation is ready to host
                this session.
              </span>
            </label>
            <ErrorMessage>{error}</ErrorMessage>
            <Button busy={busy} className="button primary full">
              {id ? 'Save changes' : 'Publish session'}{' '}
              <ArrowUpRight size={18} />
            </Button>
            <p className="small muted">
              {id
                ? config.email
                  ? 'Existing volunteers will receive an update by email.'
                  : 'Email is not connected. Please tell existing volunteers about any changes directly.'
                : 'Your listing becomes public immediately.'}
            </p>
          </div>
        </div>
      </form>
    </div>
  );
}
function App() {
  const [config, setConfig] = useState(null),
    [me, setMe] = useState(null),
    [ready, setReady] = useState(false),
    [error, setError] = useState('');
  const refresh = useCallback(async () => setMe(await api('/me')), []);
  useEffect(() => {
    Promise.all([api('/config'), api('/me')])
      .then(([c, m]) => {
        timezone = c.timezone;
        setConfig(c);
        setMe(m);
        setReady(true);
        document.title = `${c.name} · Volunteer together`;
      })
      .catch((e) => setError(e.message));
  }, []);
  if (error)
    return (
      <div className="page">
        <ErrorMessage>{error}</ErrorMessage>
        <button
          className="button primary"
          onClick={() => window.location.reload()}
        >
          Try again
        </button>
      </div>
    );
  if (!ready) return <Loading />;
  return (
    <Context.Provider value={{ config, me, refresh }}>
      <BrowserRouter>
        <Shell />
      </BrowserRouter>
    </Context.Provider>
  );
}
const root = import.meta.hot
  ? (import.meta.hot.data.root ||= createRoot(document.getElementById('root')))
  : createRoot(document.getElementById('root'));
root.render(<App />);
