import type { PortalVariant } from "@/lib/events";
import { Icon } from "../Icon";
import styles from "./Registration.module.css";

export type Participant = {
  name: string; enrollment: string; email: string; phone: string; college: string; city: string; branch: string; year: string;
};

const fields = [
  { key: "name", editorial: "Full Legal Name", cyber: "Full Name *", type: "text", placeholder: "e.g. Aarav Sharma", autocomplete: "name" },
  { key: "enrollment", editorial: "University Roll / Enrollment No", cyber: "Enrollment Number / Student ID *", type: "text", placeholder: "e.g. GEHU/2023/8492", autocomplete: "off" },
  { key: "email", editorial: "Institutional / Preferred Email", cyber: "Institutional Email Address *", type: "email", placeholder: "name@gehu.ac.in", autocomplete: "email" },
  { key: "phone", editorial: "WhatsApp Mobile Handset", cyber: "WhatsApp / Mobile Number *", type: "tel", placeholder: "+91 98765 43210", autocomplete: "tel" },
  { key: "college", editorial: "College / Academic Institution", cyber: "College / University *", type: "text", placeholder: "Graphic Era Hill University, Dehradun", autocomplete: "organization" },
  { key: "city", editorial: "City", cyber: "City *", type: "text", placeholder: "Dehradun", autocomplete: "address-level2" },
] as const;

export function ParticipantFields({ variant, value, onChange }: { variant: PortalVariant; value: Participant; onChange: (field: keyof Participant, value: string) => void }) {
  const cyber = variant === "cyber";
  const branches = cyber ? ["CSE (Core)", "AI & Machine Learning", "Data Science", "Information Tech", "ECE / EE", "Mechanical / Civil", "BCA / MCA"] : ["Computer Science & Engineering", "Information Technology", "Electronics & Comm. Engg", "Artificial Intelligence & Data Science", "Mechanical Engineering", "Other Faculty / Allied Fields"];
  const years = cyber ? ["1st Year", "2nd Year", "3rd Year", "4th Year"] : ["1st Year (Class of 2029)", "2nd Year (Class of 2028)", "3rd Year (Class of 2027)", "4th Year (Class of 2026)", "Postgraduate / Research Scholar"];
  return (
    <div className={`${styles.fields} ${cyber ? styles.cyberFields : ""}`}>
      {fields.map((field) => <div className={`${styles.field} ${field.key === "college" && !cyber ? styles.fullWidth : ""}`} key={field.key}>
        <label htmlFor={`participant-${field.key}`}>{cyber ? field.cyber : field.editorial}</label>
        <div className={styles.inputWrap}><input id={`participant-${field.key}`} name={field.key} type={field.type} placeholder={field.placeholder} autoComplete={field.autocomplete} value={value[field.key]} onChange={(e) => onChange(field.key, e.target.value)} required />{cyber && field.key !== "college" && value[field.key] && <Icon name="check_circle" />}</div>
      </div>)}
      <div className={cyber ? styles.compactFields : styles.displayContents}>
        <div className={styles.field}><label htmlFor="participant-branch">{cyber ? "Branch / Dept *" : "Academic Department"}</label><select id="participant-branch" name="branch" value={value.branch} onChange={(e) => onChange("branch", e.target.value)} required>{branches.map((branch) => <option key={branch}>{branch}</option>)}</select></div>
        <div className={styles.field}><label htmlFor="participant-year">{cyber ? "Year of Study *" : "Year of Enlistment"}</label><select id="participant-year" name="year" value={value.year} onChange={(e) => onChange("year", e.target.value)} required>{years.map((year) => <option key={year}>{year}</option>)}</select></div>
      </div>
    </div>
  );
}
