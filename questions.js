'use strict';
// DBMS question bank. Each row: [topic, question, correct, wrong1, wrong2, wrong3, explanation]
// Correct answer is listed first here; the server shuffles options per question.
const TOPICS = {
  keys: { name: 'Keys & Relational Model', icon: '🔑' },
  norm: { name: 'Normalization', icon: '🧬' },
  sql:  { name: 'SQL Queries', icon: '⚡' },
  join: { name: 'Joins', icon: '🔗' },
  tx:   { name: 'Transactions & ACID', icon: '🛡️' },
  idx:  { name: 'Indexing', icon: '🚀' },
  er:   { name: 'ER Modeling', icon: '🗺️' }
};

const RAW = [
  // ---- keys
  ['keys', 'Which key uniquely identifies each row of a table and can never be NULL?', 'Primary key', 'Foreign key', 'Check constraint', 'Default constraint',
   'A primary key uniquely identifies rows and is implicitly NOT NULL. A foreign key links to another table and may repeat or be NULL.'],
  ['keys', 'What does a foreign key enforce?', 'Referential integrity between two tables', 'Uniqueness inside its own table', 'Sorted order of rows', 'Encryption of the column',
   'A foreign key guarantees that each value points to an existing row in the referenced table (or is NULL), so there are no dangling references.'],
  ['keys', 'What is a super key?', 'Any set of attributes that uniquely identifies a row, possibly with extra attributes', 'A minimal set of attributes that identifies a row', 'A key that references another table', 'A key made of exactly one column',
   'Every candidate key is a super key, but a super key may contain redundant attributes. Candidate keys are the minimal super keys.'],
  ['keys', 'Relation R(A, B, C) has the functional dependencies A → B and B → C. Which is the only candidate key?', 'A', 'B', 'C', 'BC',
   'The closure A+ = {A, B, C}, so A determines everything. B+ = {B, C} misses A, and C determines nothing else.'],
  ['keys', 'A table has four candidate keys. How many primary keys can it have?', 'Exactly one', 'Up to four', 'As many as it has columns', 'None, primary keys are optional by definition',
   'A table has at most one primary key (chosen from the candidate keys). The others become alternate keys, usually enforced with UNIQUE.'],
  ['keys', 'Which statement about NULL is correct?', 'NULL = NULL evaluates to UNKNOWN, not TRUE', 'NULL is the same as 0', 'NULL is the same as an empty string', 'NULL = NULL evaluates to TRUE',
   'NULL means unknown or missing. Any comparison with NULL yields UNKNOWN, so use IS NULL or IS NOT NULL.'],
  ['keys', 'A table has 5 columns and 120 rows. What are its degree and cardinality?', 'Degree 5, cardinality 120', 'Degree 120, cardinality 5', 'Degree 125, cardinality 125', 'Degree 5, cardinality 5',
   'Degree is the number of attributes (columns). Cardinality is the number of tuples (rows).'],
  ['keys', 'When do you need a composite primary key?', 'When no single column is unique, e.g. (student_id, course_id) in an enrollment table', 'Whenever the table has more than 100 rows', 'Whenever columns are of type text', 'To make sorting faster',
   'A composite key combines several columns to form uniqueness, common in junction tables for many-to-many relationships.'],

  // ---- norm
  ['norm', 'First Normal Form (1NF) requires that...', 'every column holds atomic values and there are no repeating groups', 'there are no partial dependencies', 'there are no transitive dependencies', 'every determinant is a candidate key',
   'A table in 1NF has single, indivisible values per cell. A column such as "phones" holding "123, 456" breaks 1NF.'],
  ['norm', 'Second Normal Form (2NF) removes which problem?', 'Partial dependency of a non-key attribute on part of a composite key', 'Transitive dependency between non-key attributes', 'Multivalued attributes', 'Duplicate rows',
   '2NF = 1NF + no non-prime attribute depends on only a part of a candidate key. It only matters when the key is composite.'],
  ['norm', 'Third Normal Form (3NF) additionally forbids...', 'transitive dependency of a non-key attribute on the key', 'partial dependency on a composite key', 'foreign keys', 'composite keys',
   'In 3NF, non-key attributes depend on "the key, the whole key, and nothing but the key".'],
  ['norm', 'BCNF requires that for every non-trivial functional dependency X → Y...', 'X is a super key', 'Y is a prime attribute', 'X is a single attribute', 'Y is a super key',
   'BCNF is stricter than 3NF: every determinant of a non-trivial dependency must be a super key.'],
  ['norm', 'Student(roll, name, dept, dept_head) with roll → dept and dept → dept_head. What is the problem?', 'dept_head depends on roll transitively through dept (violates 3NF)', 'dept_head depends on part of a composite key (violates 2NF)', 'name is not atomic (violates 1NF)', 'The table has no key at all',
   'roll → dept → dept_head is a transitive dependency. Fix it by moving (dept, dept_head) into its own Department table.'],
  ['norm', 'Why would a designer deliberately denormalize a schema?', 'To speed up read-heavy queries by avoiding joins, accepting some redundancy', 'To remove all update anomalies', 'To always save disk space', 'To enforce foreign keys',
   'Denormalization trades redundancy and write complexity for faster reads, common in analytics and reporting.'],
  ['norm', 'Deleting the last student of a department also erases the only record of that department. This is a...', 'Deletion anomaly', 'Insertion anomaly', 'Update anomaly', 'Join anomaly',
   'A deletion anomaly means deleting one fact unintentionally destroys another because both live in one table.'],
  ['norm', 'A decomposition of R into R1 and R2 is lossless if...', 'R1 ∩ R2 is a key of R1 or of R2', 'R1 and R2 share no attributes', 'R1 and R2 have the same number of columns', 'both R1 and R2 are only in 1NF',
   'The common attributes must functionally determine all of R1 or all of R2. Then joining R1 and R2 gives back exactly R, with no spurious rows.'],

  // ---- sql
  ['sql', 'Which clause filters groups after aggregation?', 'HAVING', 'WHERE', 'GROUP BY', 'ORDER BY',
   'WHERE filters rows before grouping. HAVING filters the groups produced by GROUP BY, so it can use aggregates like AVG().'],
  ['sql', 'Which part of a SELECT is logically evaluated first?', 'FROM', 'WHERE', 'SELECT', 'ORDER BY',
   'Logical order: FROM, WHERE, GROUP BY, HAVING, SELECT, DISTINCT, ORDER BY, LIMIT. That is why a SELECT alias cannot be used in WHERE.'],
  ['sql', 'Table t has 10 rows and column x is NULL in 3 of them. What do COUNT(*) and COUNT(x) return?', '10 and 7', '7 and 7', '10 and 10', '7 and 10',
   'COUNT(*) counts rows. COUNT(column) counts only non-NULL values in that column.'],
  ['sql', 'What does this return?\nSELECT dept, AVG(salary)\nFROM emp\nGROUP BY dept\nHAVING AVG(salary) > 50000;', 'Departments whose average salary exceeds 50000, with that average', 'Every employee who earns more than 50000', 'The total salary of each department', 'The single highest-paid department',
   'GROUP BY forms one group per department, then HAVING keeps only groups whose average is above 50000.'],
  ['sql', "Which condition matches names that start with the letter A?", "name LIKE 'A%'", "name LIKE '%A'", "name = 'A*'", "name LIKE 'A_'",
   "% matches any number of characters. 'A_' would match exactly two-character names, and '%A' ends with A."],
  ['sql', 'Which statement removes a table definition together with all its data?', 'DROP TABLE', 'TRUNCATE TABLE', 'DELETE FROM', 'UPDATE',
   'DROP removes the table itself. TRUNCATE and DELETE empty it but keep the structure.'],
  ['sql', 'What does SELECT DISTINCT city FROM customers return?', 'Each city once, with duplicates removed', 'Only cities that appear exactly once', 'Only the first row', 'The number of cities',
   'DISTINCT removes duplicate result rows. Use COUNT(DISTINCT city) if you want the number of cities.'],
  ['sql', 'What does this query return?\nSELECT name FROM emp\nWHERE salary = (SELECT MAX(salary) FROM emp);', 'All employees who have the highest salary, ties included', 'Only one employee, chosen at random', 'The highest salary value', 'The employee with the second-highest salary',
   'The subquery returns the maximum salary. The outer query returns every employee matching it, so ties all appear.'],
  ['sql', 'Why does SELECT * FROM emp WHERE manager_id = NULL return no rows?', 'Comparing with NULL using = gives UNKNOWN, so you must write IS NULL', 'NULL is not allowed in WHERE', 'The column must be indexed first', 'manager_id is a reserved word',
   'In SQL three-valued logic, = NULL is never TRUE. Use WHERE manager_id IS NULL.'],

  // ---- join
  ['join', 'A has ids {1, 2, 3} and B has ids {2, 3, 4}. How many rows does A INNER JOIN B ON A.id = B.id return?', '2', '3', '4', '6',
   'INNER JOIN keeps only matching ids: 2 and 3.'],
  ['join', 'A has ids {1, 2, 3} and B has ids {2, 3, 4}. How many rows does A LEFT JOIN B ON A.id = B.id return?', '3', '2', '4', '6',
   'Every row of A is kept. Id 1 has no match, so its B columns are NULL. Result: ids 1, 2, 3.'],
  ['join', 'A has ids {1, 2, 3} and B has ids {2, 3, 4}. How many rows does A FULL OUTER JOIN B ON A.id = B.id return?', '4', '3', '2', '6',
   'Matching rows (2, 3) plus unmatched rows from both sides (1 from A and 4 from B) gives 4 rows.'],
  ['join', 'A has 3 rows and B has 3 rows. How many rows does A CROSS JOIN B return?', '9', '6', '3', '0',
   'A CROSS JOIN produces the Cartesian product: 3 × 3 = 9 rows.'],
  ['join', 'emp(id, name, manager_id) holds employees and their managers. How do you list each employee next to the manager name?', 'Join the emp table to itself', 'CROSS JOIN with a different database', 'UNION emp with emp', 'It cannot be done with one table',
   'A self join uses two aliases of the same table: emp e JOIN emp m ON e.manager_id = m.id.'],
  ['join', 'How do you list customers who have never placed an order?', 'LEFT JOIN orders and keep rows where orders.id IS NULL', 'INNER JOIN orders on customer id', 'CROSS JOIN orders', 'RIGHT JOIN orders and keep rows where orders.id IS NOT NULL',
   'This is an anti-join. Unmatched customers get NULL order columns after the LEFT JOIN, so IS NULL isolates them.'],
  ['join', 'NATURAL JOIN joins two tables on...', 'all columns that have the same name in both tables', 'the primary key only', 'the first column of each table', 'no condition',
   'NATURAL JOIN picks the common column names automatically. It is fragile, because adding a column later can silently change the join.'],
  ['join', 'Customer c has 3 orders. How many result rows does c get in customers INNER JOIN orders?', '3', '1', '4', '0',
   'In a one-to-many join the "one" side is repeated once per matching row on the "many" side.'],

  // ---- tx
  ['tx', 'In ACID, what does the "A" stand for?', 'Atomicity', 'Availability', 'Authorization', 'Aggregation',
   'ACID = Atomicity, Consistency, Isolation, Durability.'],
  ['tx', 'A bank transfer debits account A, then the server crashes before crediting account B. Which property rolls the debit back?', 'Atomicity', 'Durability', 'Isolation', 'Normalization',
   'Atomicity is all-or-nothing: an incomplete transaction is undone on recovery.'],
  ['tx', 'What does Durability guarantee?', 'Once committed, changes survive crashes, typically through a write-ahead log', 'Uncommitted changes are visible to everyone', 'Transactions always run one at a time', 'Tables never need backups',
   'Durability means committed data is persisted (redo log / WAL) so it survives power loss or crashes.'],
  ['tx', 'Reading data written by another transaction that later rolls back is called a...', 'Dirty read', 'Phantom read', 'Lost update', 'Deadlock',
   'A dirty read sees uncommitted data that may disappear. READ COMMITTED and above prevent it.'],
  ['tx', 'Which SQL isolation level prevents dirty reads but still allows non-repeatable reads?', 'READ COMMITTED', 'READ UNCOMMITTED', 'REPEATABLE READ', 'SERIALIZABLE',
   'READ COMMITTED only shows committed data, but re-reading a row can return a different value if another transaction commits in between.'],
  ['tx', 'T1 holds a lock on X and waits for Y, while T2 holds Y and waits for X. How is this typically resolved?', 'The DBMS detects the deadlock and aborts one transaction as the victim', 'Both transactions wait forever by design', 'Both transactions commit automatically', 'The locks are silently ignored',
   'This is a deadlock. Databases detect the cycle in the wait-for graph and roll back a victim, or use timeouts.'],
  ['tx', 'Two-phase locking (2PL) guarantees...', 'conflict serializability', 'freedom from deadlocks', 'durability', 'faster queries',
   '2PL (grow phase, then shrink phase) ensures conflict-serializable schedules, but it can still deadlock.'],
  ['tx', 'What does ROLLBACK do?', 'Undoes all changes made since the transaction began (or since the last savepoint)', 'Makes changes permanent', 'Locks the whole table', 'Creates an index',
   'ROLLBACK discards the transaction\'s uncommitted work. COMMIT is what makes it permanent.'],

  // ---- idx
  ['idx', 'What is the main purpose of a database index?', 'Speed up lookups at the cost of extra storage and slower writes', 'Enforce foreign keys', 'Encrypt the column', 'Reduce the number of columns',
   'An index is an extra structure that lets the engine find rows without scanning the whole table. Every write must also update it.'],
  ['idx', 'Which data structure do most relational database indexes use?', 'B+ tree', 'Binary heap', 'Linked list', 'Stack',
   'B+ trees keep keys sorted, support range scans through linked leaves, and stay balanced.'],
  ['idx', 'Why are B+ trees preferred over binary trees for disk-based indexes?', 'High fan-out gives a shallow tree, so fewer disk reads per lookup', 'They need no sorting', 'They store no keys', 'They are always smaller than the table',
   'Each node is a disk page holding hundreds of keys. A table with millions of rows needs only about 3 or 4 levels.'],
  ['idx', 'Which statement about a clustered index is true?', 'It defines the physical order of rows, so a table can have only one', 'A table can have many clustered indexes', 'It is always a hash index', 'It stores no row data',
   'The data rows are stored in the order of the clustered key. Other (non-clustered) indexes point back to those rows.'],
  ['idx', "A composite index exists on (last_name, first_name). Which query can use it efficiently?", "WHERE last_name = 'Rao'", "WHERE first_name = 'Asha'", 'Neither of them', "ORDER BY first_name alone",
   'The leftmost-prefix rule: a composite index helps when the query uses the leading column(s). first_name alone skips the leading column.'],
  ['idx', 'Which predicate usually cannot use a plain index on the column email?', "WHERE LOWER(email) = 'a@x.com'", "WHERE email = 'a@x.com'", "WHERE email LIKE 'a%'", "WHERE email > 'm'",
   'Wrapping the column in a function hides it from the index. Use a functional index or store a normalized copy.'],
  ['idx', 'A hash index is best suited for...', 'Equality lookups, not range queries', 'Range scans', 'ORDER BY', "Prefix matches like LIKE 'ab%'",
   'Hashing scatters keys, so it gives O(1) equality lookups but loses ordering, which range queries and sorting need.'],
  ['idx', 'What is the main downside of adding too many indexes?', 'INSERT, UPDATE and DELETE get slower and storage grows', 'SELECT queries always become slower', 'The database loses ACID properties', 'The primary key stops working',
   'Each index must be maintained on every write. Index what your queries need, not everything.'],

  // ---- er
  ['er', 'In a classic ER diagram, what does a rectangle represent?', 'An entity', 'An attribute', 'A relationship', 'A key',
   'Rectangles are entities, ovals are attributes, and diamonds are relationships (Chen notation).'],
  ['er', 'How is a many-to-many relationship between Student and Course mapped to tables?', 'A separate junction table holding foreign keys to both', 'One foreign key column inside Student only', 'A comma-separated list in Course', 'No extra table is needed',
   'A junction (associative) table such as Enrollment(student_id, course_id) turns M:N into two 1:N relationships.'],
  ['er', 'What is a weak entity?', 'An entity that cannot be identified by its own attributes alone and depends on an owner entity', 'An entity with no attributes', 'An entity with no relationships', 'An entity with fewer than three rows',
   'A weak entity (e.g. Dependent of Employee) has only a partial key and is identified together with its owner\'s key.'],
  ['er', 'In a one-to-many relationship Department 1:N Employee, where does the foreign key go?', 'In Employee, as dept_id', 'In Department, as a list of employees', 'In both tables', 'Nowhere, it is not stored',
   'The foreign key always lives on the "many" side, so each employee row points to one department.'],
  ['er', 'An employee can have several phone numbers (a multivalued attribute). How is it stored relationally?', 'In a separate table keyed by employee id', 'As a comma-separated string in one column', 'Only the first number is kept', 'As a primary key',
   'Multivalued attributes get their own table. A comma-separated column would violate 1NF.'],
  ['er', 'What does total participation mean?', 'Every entity instance must take part in the relationship', 'Some instances may not take part', 'The relationship has no attributes', 'The relationship is always many-to-many',
   'Total participation (a double line in ER diagrams) means every instance participates, e.g. every Employee must belong to a Department.'],
  ['er', 'Student and Teacher are modelled as sub-types of Person. This is called...', 'Specialization (an is-a hierarchy)', 'Aggregation', 'Normalization', 'Denormalization',
   'Specialization creates subclasses that inherit the attributes of a superclass. The reverse view is generalization.'],
  ['er', 'Age computed from date_of_birth is an example of a...', 'Derived attribute', 'Composite attribute', 'Multivalued attribute', 'Key attribute',
   'A derived attribute can be calculated from other data, so it is usually computed rather than stored.']
];

const BANK = RAW.map((r, i) => ({
  id: i,
  topic: r[0],
  text: r[1],
  options: [r[2], r[3], r[4], r[5]],
  answer: 0,
  explain: r[6]
}));

function shuffle(a, rnd = Math.random) {
  a = a.slice();
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(rnd() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

// Returns a question with shuffled options and the index of the right one.
function instance(q) {
  const order = shuffle([0, 1, 2, 3]);
  return {
    id: q.id,
    topic: q.topic,
    text: q.text,
    options: order.map((k) => q.options[k]),
    answer: order.indexOf(0),
    explain: q.explain
  };
}

// Pick n questions, avoiding ids in `used` first. Spreads across topics.
function pick(n, { topic = null, used = new Set() } = {}) {
  let pool = BANK.filter((q) => !topic || topic === 'all' || q.topic === topic);
  let fresh = pool.filter((q) => !used.has(q.id));
  if (fresh.length < n) fresh = pool;
  fresh = shuffle(fresh);
  if (!topic || topic === 'all') {
    // round-robin by topic so a battle feels varied
    const by = {};
    fresh.forEach((q) => (by[q.topic] = by[q.topic] || []).push(q));
    const keys = shuffle(Object.keys(by));
    const out = [];
    while (out.length < n && keys.some((k) => by[k].length)) {
      for (const k of keys) if (by[k].length && out.length < n) out.push(by[k].shift());
    }
    return shuffle(out).map(instance);
  }
  return fresh.slice(0, n).map(instance);
}

module.exports = { TOPICS, BANK, pick, instance };
