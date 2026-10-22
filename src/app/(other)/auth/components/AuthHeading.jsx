/** Heading block for the staff auth screens: amber-rule eyebrow, Newsreader title, muted line. */
const AuthHeading = ({ kicker, title, sub }) => (
  <div className="hc-auth-heading">
    {kicker && <div className="hc-auth-kicker">{kicker}</div>}
    <h1>{title}</h1>
    {sub && <p>{sub}</p>}
  </div>
)

export default AuthHeading
