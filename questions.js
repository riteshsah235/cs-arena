'use strict';
// DBMS question bank. Each row: [topic, question, correct, wrong1, wrong2, wrong3, explanation]
// Correct answer is listed first here; the server shuffles options per question.
const TOPICS = {
  arch: { name: 'DBMS Basics & Architecture', icon: '🏛️' },
  keys: { name: 'Keys & Relational Model', icon: '🔑' },
  ra:   { name: 'Relational Algebra', icon: '∑' },
  er:   { name: 'ER Modeling', icon: '🗺️' },
  sql:  { name: 'SQL Queries', icon: '⚡' },
  join: { name: 'Joins', icon: '🔗' },
  norm: { name: 'Normalization', icon: '🧬' },
  tx:   { name: 'Transactions & ACID', icon: '🛡️' },
  idx:  { name: 'Indexing', icon: '🚀' },
  opt:  { name: 'Storage & Query Optimization', icon: '🧠' },
  dist: { name: 'Distributed & NoSQL', icon: '🌐' }
};
const LEVELS = { easy: 'Easy', moderate: 'Moderate', hard: 'Hard' };
const LV = { e: 'easy', m: 'moderate', h: 'hard' };
// difficulty of the first 57 questions, in order
const OLD_DIFF = 'eemmemememmhmmehemmmeeemmeememmmeemeemmheeemmhhmmemmmmmme';

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

const NEW = [
// ---------------- arch: DBMS basics & architecture
['arch','e','What is a DBMS?','Software that lets you define, store, query and manage data in a database','A spreadsheet program','A network protocol for sending data','A programming language compiler','A DBMS (e.g. MySQL, PostgreSQL, Oracle) sits between users/applications and the stored data and handles definition, access, security and integrity.'],
['arch','e','Which is an advantage of a DBMS over plain file processing?','Controlled redundancy and safe concurrent access by many users','It never needs a schema','It makes single tiny files faster to open','It removes the need for backups','A DBMS centralizes data, reduces duplicate copies, enforces integrity rules and coordinates concurrent users, which flat files do not.'],
['arch','e','Which of these is a DDL (Data Definition Language) command?','ALTER TABLE','INSERT','SELECT','COMMIT','DDL defines or changes structure: CREATE, ALTER, DROP, TRUNCATE. INSERT and SELECT are DML, COMMIT is TCL.'],
['arch','e','Which of these is a DML (Data Manipulation Language) command?','INSERT','CREATE','GRANT','DROP','DML works on the data inside tables: SELECT, INSERT, UPDATE, DELETE.'],
['arch','e','GRANT and REVOKE belong to which category of SQL commands?','DCL (Data Control Language)','DDL','DML','TCL','DCL controls permissions. GRANT gives privileges and REVOKE removes them.'],
['arch','e','Metadata in a database means...','Data about data, such as table names, column types and constraints','The largest table in the database','Backup copies of the data','Encrypted passwords','The system catalog (data dictionary) stores metadata so the DBMS knows what it manages.'],
['arch','m','Physical data independence means you can change...','storage structures or add an index without changing the conceptual schema or applications','the logical tables without touching any application','the SQL dialect without changing queries','the operating system without reinstalling the DBMS','It separates the internal (physical) level from the conceptual level, so performance tuning does not break applications.'],
['arch','m','The three-schema architecture has which three levels?','External, conceptual and internal','Client, server and database','Entity, attribute and relationship','Logical, binary and hexadecimal','External = user views, conceptual = the whole logical design, internal = physical storage.'],
['arch','m','Which schema level describes what data is stored and the relationships among it for the whole database?','Conceptual schema','External schema','Internal schema','Physical schema only','The conceptual (logical) schema describes entities, attributes, relationships and constraints for the entire database, independent of storage details.'],
['arch','m','A database "view" at the external level is mainly used to...','Show each user group only the data they need','Speed up all writes','Store a second copy of the database','Replace the primary key','External views give tailored, restricted perspectives of the data and add a layer of security and simplicity.'],
['arch','h','Why is logical data independence harder to achieve than physical data independence?','Applications depend directly on the logical structure (tables and columns) they query','Disks change faster than tables','The DBMS does not support views','Logical changes never affect storage','If a table or column an application uses changes, the application usually has to change too. Views and mapping layers only partly hide this.'],
['arch','h','Why does a DBMS keep a buffer pool in memory?','To cache hot pages and cut disk I/O, since disk reads are far slower than memory','To encrypt pages before writing','To enforce foreign keys','To store the transaction log permanently','Disk access dominates cost. The buffer manager keeps recently used pages in RAM and picks victims with policies like LRU or clock.'],

// ---------------- ra: relational algebra
['ra','e','In relational algebra, what does selection (σ) do?','Picks rows that satisfy a condition','Picks columns','Joins two relations','Renames a relation','σ_condition(R) filters tuples. Projection (π) is the one that picks columns.'],
['ra','e','In relational algebra, what does projection (π) do?','Keeps only the chosen columns and removes duplicate rows','Keeps only the chosen rows','Combines two tables','Sorts the result','π_A,B(R) keeps attributes A and B. Because a relation is a set, duplicate result tuples are removed.'],
['ra','e','R has 10 tuples and S has 4. How many tuples does R × S have?','40','14','10','6','The Cartesian product pairs every tuple of R with every tuple of S: 10 × 4 = 40.'],
['ra','m','Two relations are union-compatible when...','they have the same number of attributes with compatible domains','they have the same name','they have the same number of tuples','they share a primary key','Union, intersection and set difference need operands with matching attribute count and domains.'],
['ra','m','Which of these is NOT a fundamental relational algebra operation?','Join','Union','Set difference','Cartesian product','The fundamental operations are σ, π, ∪, −, × and ρ. Join is derived: a selection over a Cartesian product.'],
['ra','m','Relational division (R ÷ S) is used to answer queries like...','"Which students have taken ALL the courses in a given set?"','"Which students took at least one course?"','"How many students are there?"','"List students sorted by name."','Division finds tuples in R that are related to every tuple of S, a "for all" query.'],
['ra','m','Relational algebra is best described as...','A procedural query language that specifies how to compute the result','A declarative language based on predicate logic','A storage format','A transaction protocol','Relational algebra gives a sequence of operations. Relational calculus is the declarative counterpart. SQL mixes ideas from both.'],
['ra','h','R(A, B) has 5 tuples and 3 distinct values of A. How many tuples does π_A(R) return?','3','5','2','15','Projection removes duplicates, so one tuple per distinct A value: 3.'],
['ra','h','Which equation is correct?','σ_c(R ∪ S) = σ_c(R) ∪ σ_c(S)','σ_c(R ∪ S) = σ_c(R) − σ_c(S)','σ_c(R ∪ S) = σ_c(R) × σ_c(S)','σ_c(R ∪ S) = π_c(R) ∪ π_c(S)','Selection distributes over union, since each tuple is tested independently.'],
['ra','h','Why does a query optimizer push selections below joins?','It shrinks the inputs before the expensive join, producing fewer intermediate tuples','It makes the join result different','It removes the need for indexes','It guarantees sorted output','Filtering early reduces the size of intermediate results, usually the biggest cost saver in an algebra tree.'],

// ---------------- keys
['keys','e','What is an alternate key?','A candidate key that was not chosen as the primary key','A key from another database','A key that may repeat','A copy of the primary key','Alternate keys are the leftover candidate keys, usually enforced with UNIQUE NOT NULL.'],
['keys','e','Can a foreign key column contain NULL?','Yes, unless it is also declared NOT NULL','Never','Only in the first row','Only when it is also a primary key','A NULL foreign key means "no related row". The column is checked only when it holds a value.'],
['keys','m','What is a surrogate key?','An artificial, system-generated key with no business meaning, e.g. an auto-increment id','A key made of every column','A key copied from a foreign table','A key stored in the index only','Surrogate keys (serials, UUIDs) are stable and short, unlike natural keys like email that can change.'],
['keys','m','In R(A, B, C), which functional dependency makes A a key?','A → BC','B → AC','C → A','AB → C','A key must determine all other attributes. A → BC gives A+ = {A, B, C}.'],
['keys','h','R(A, B, C) has A as its only candidate key. How many super keys does R have?','4','3','1','8','Every super key must contain A. The other two attributes can each be present or absent: 2² = 4 (A, AB, AC, ABC).'],
['keys','h','R(A, B, C, D) with FDs AB → C, C → D, D → A. How many candidate keys does it have?','3 (AB, BC, BD)','1','2','4','AB+ = ABCD. BC+: C → D, D → A, so BC+ = ABCD. BD+: D → A, then AB → C, so BD+ = ABCD. B alone does not work and no single other attribute works, so the keys are AB, BC and BD.'],

// ---------------- norm
['norm','e','Storing the same department name in thousands of employee rows mainly causes...','Redundancy and update anomalies','Faster queries only','Better integrity','Smaller tables','Repeated facts must be changed everywhere. Missing one copy leaves inconsistent data.'],
['norm','e','You cannot add a new department until it has at least one employee. This is an...','Insertion anomaly','Deletion anomaly','Update anomaly','Join anomaly','Because department data is stored inside the employee table, it cannot exist without an employee row.'],
['norm','m','The functional dependency X → Y means...','Whenever two rows agree on X they must also agree on Y','X and Y are always equal','Y is unique','X is a foreign key to Y','X determines Y: a given X value is always paired with the same Y value.'],
['norm','m','With FDs A → B and B → C in R(A, B, C), what is the closure of {A}?','{A, B, C}','{A}','{A, B}','{B, C}','Start with A, add B (A → B), then add C (B → C). A+ = {A, B, C}.'],
['norm','m','Which statement is true?','Every BCNF relation is also in 3NF','Every 3NF relation is also in BCNF','BCNF and 3NF are identical','1NF implies 3NF','BCNF is strictly stronger. Some 3NF relations violate BCNF when a non-superkey determines a prime attribute.'],
['norm','h','Which normal form deals with multivalued dependencies?','4NF','2NF','3NF','BCNF','4NF removes non-trivial multivalued dependencies that are not implied by a key, such as independent multi-valued facts in one table.'],
['norm','h','R(A, B, C) has the single FD A → B and the key is AC. What is the highest normal form R satisfies?','1NF','2NF','3NF','BCNF','B depends on A, only part of the key AC. That is a partial dependency, so R violates 2NF and sits in 1NF.'],
['norm','h','What is a canonical (minimal) cover of a set of FDs?','An equivalent FD set with no redundant FDs or extraneous attributes','The set of all FDs that can be derived','The set of candidate keys','The largest possible FD set','It is used when synthesizing 3NF schemas. It has single-attribute right sides, no extraneous left attributes and no redundant FD.'],
['norm','h','A decomposition is dependency preserving if...','Every original FD can be checked on the individual relations without joining them','The join is lossless','All tables are in BCNF','No attribute appears twice','This lets the DBMS enforce constraints cheaply per table. BCNF decomposition may lose it, while 3NF synthesis always preserves it.'],

// ---------------- sql
['sql','e','Without an explicit direction, ORDER BY sorts...','Ascending','Descending','Randomly','By insertion time','ASC is the default. Use DESC for descending order.'],
['sql','e','What does UPDATE emp SET salary = salary * 1.1; (no WHERE) do?','Raises the salary of every row','Raises only the first row','Does nothing','Raises salaries only for NULL values','Without WHERE, UPDATE touches all rows. Always check your WHERE clause first.'],
['sql','e','Which rows does WHERE age BETWEEN 10 AND 20 match?','Ages 10 through 20, both ends included','Ages 11 through 19','Ages 10 through 19','Ages 11 through 20','BETWEEN is inclusive on both bounds.'],
['sql','e','Column x holds the values 10, 20 and NULL. What does AVG(x) return?','15','10','30','NULL','Aggregates skip NULLs. AVG = (10 + 20) / 2 = 15.'],
['sql','e','Which constraint stops a column from storing NULL?','NOT NULL','UNIQUE','CHECK(x > 0) only','DEFAULT','NOT NULL rejects missing values. UNIQUE alone still allows NULLs in most databases.'],
['sql','m','What is the difference between UNION and UNION ALL?','UNION removes duplicate rows, UNION ALL keeps them','UNION keeps duplicates, UNION ALL removes them','They are identical','UNION ALL sorts the output','UNION must de-duplicate, which costs a sort or hash. UNION ALL just concatenates and is faster.'],
['sql','m','Which query returns the second-highest salary?','SELECT MAX(salary) FROM emp WHERE salary < (SELECT MAX(salary) FROM emp)','SELECT MAX(salary) - 1 FROM emp','SELECT MIN(salary) FROM emp','SELECT salary FROM emp LIMIT 2','It finds the maximum among salaries below the overall maximum. (LIMIT 2 returns two rows, not the second value.)'],
['sql','m','What is a view?','A stored query that behaves like a virtual table','A physical copy of a table','An index on every column','A kind of trigger','A normal view stores no data. Its query runs when the view is used. Materialized views do store results.'],
['sql','m','A foreign key is declared with ON DELETE CASCADE. What happens when a parent row is deleted?','Matching child rows are deleted automatically','The delete is always blocked','Child foreign keys become 0','Nothing happens to the children','CASCADE propagates the delete. Alternatives are RESTRICT, SET NULL and NO ACTION.'],
['sql','m','What does COALESCE(bonus, 0) return?','The first non-NULL argument, so 0 when bonus is NULL','Always 0','NULL when bonus is 0','The sum of bonus and 0','COALESCE walks its arguments left to right and returns the first one that is not NULL.'],
['sql','m','What is a correlated subquery?','A subquery that refers to columns of the outer query and is evaluated for each outer row','A subquery that runs only once','A subquery with no WHERE clause','A subquery in the FROM clause only','Because it depends on the outer row, it is conceptually re-evaluated per row, although optimizers often rewrite it into a join.'],
['sql','h','Table b has a NULL in b.id. What does SELECT * FROM a WHERE id NOT IN (SELECT id FROM b) return?','No rows','All rows of a','Only rows where id is NULL','An error','x NOT IN (..., NULL) becomes UNKNOWN for every non-matching x, so nothing qualifies. Prefer NOT EXISTS.'],
['sql','h','Scores are 100, 90, 90, 80. What rank does 80 get with RANK()?','4','3','2','1','RANK leaves gaps after ties: 1, 2, 2, 4. DENSE_RANK would give 1, 2, 2, 3.'],
['sql','h','What happens to a LEFT JOIN when you add WHERE right_table.col = \'x\'?','It effectively becomes an INNER JOIN, because NULL-extended rows are filtered out','It becomes a FULL OUTER JOIN','It stays unchanged','It raises an error','Unmatched left rows have NULL right columns, and NULL = \'x\' is not true, so they disappear. Move the condition into ON to keep them.'],
['sql','h','What does SUM(amount) OVER (ORDER BY id) compute?','A running total in id order, one result per row','One total for the whole table, collapsing rows','The sum per group, collapsing rows','The sum of ids','Window functions keep every row. With ORDER BY, the default frame accumulates from the first row to the current one.'],
['sql','h','Why is SELECT dept, name, MAX(salary) FROM emp GROUP BY dept invalid in standard SQL?','name is neither grouped nor aggregated','MAX cannot be used with GROUP BY','dept must be unique','GROUP BY needs HAVING','Every selected column must be in GROUP BY or inside an aggregate. Some databases allow it but pick an arbitrary name.'],
['sql','h','Column x holds 1, 1, 2 and NULL. What does COUNT(DISTINCT x) return?','2','3','4','1','DISTINCT ignores NULL and collapses duplicates, leaving the values 1 and 2.'],
['sql','h','How does GROUP BY treat NULLs in the grouping column?','All NULLs are put into one group','Each NULL forms its own group','NULL rows are dropped','It raises an error','For grouping and DISTINCT, NULLs are considered "not distinct" from each other, even though NULL = NULL is not true.'],

// ---------------- join
['join','e','Which join returns only the rows that have a match in both tables?','INNER JOIN','LEFT JOIN','FULL OUTER JOIN','CROSS JOIN','INNER JOIN keeps matching pairs only.'],
['join','e','What does FULL OUTER JOIN keep?','Matching rows plus unmatched rows from both tables','Only the matching rows','Only unmatched rows from the left','Every pair of rows','Unmatched rows from either side appear once, with NULLs for the missing side.'],
['join','m','A RIGHT JOIN B is equivalent to...','B LEFT JOIN A','A INNER JOIN B','B CROSS JOIN A','A FULL JOIN B','Swapping the operands turns a RIGHT JOIN into a LEFT JOIN (column order aside).'],
['join','m','A has two rows with id = 1 and B has three rows with id = 1. How many rows does an INNER JOIN on id produce for id = 1?','6','5','3','2','Each of the 2 rows pairs with each of the 3 rows: 2 × 3 = 6.'],
['join','h','A.id = {1, 1, NULL} and B.id = {1, NULL}. How many rows does A INNER JOIN B ON A.id = B.id return?','2','3','4','1','The two 1s each match the single 1 in B. NULL never equals NULL in a join condition.'],
['join','h','Which join algorithm usually wins for large, unsorted inputs with an equality condition and enough memory?','Hash join','Naive nested-loop join','Cartesian product','Index scan of the smaller table only','Hash join builds a hash table on the smaller input and probes it with the larger one in roughly linear time.'],
['join','h','A sort-merge join needs...','Both inputs sorted on the join key (it sorts them first if they are not)','An index on every column','One input to fit in memory','Only equality on primary keys','After sorting, a single synchronized pass merges matches. It is good when inputs are already sorted or the output must be sorted.'],

// ---------------- tx
['tx','e','What does COMMIT do?','Makes all changes of the transaction permanent','Undoes the transaction','Starts a new table','Locks the database','COMMIT ends the transaction successfully and durably saves its changes.'],
['tx','e','What is a SAVEPOINT?','A marker inside a transaction you can roll back to without undoing everything','A backup file','A kind of index','A permanent snapshot','ROLLBACK TO SAVEPOINT undoes only the work done after that marker.'],
['tx','m','Transaction T1 runs the same range query twice. T2 inserts a matching row and commits in between, so T1 sees an extra row. This is a...','Phantom read','Dirty read','Lost update','Deadlock','Phantoms are new rows that appear in a repeated predicate read. Only SERIALIZABLE prevents them in the SQL standard.'],
['tx','m','T1 reads a row twice and sees different values because T2 updated and committed it in between. This is a...','Non-repeatable read','Dirty read','Phantom read','Lost update','The same row returns different values within one transaction. REPEATABLE READ prevents it.'],
['tx','m','Two transactions read balance = 100, then both write back their own computed value, and one write overwrites the other. This is a...','Lost update','Dirty read','Phantom read','Deadlock','The first update is silently lost. Locks, SELECT ... FOR UPDATE or optimistic version checks prevent it.'],
['tx','m','Which statement about shared (S) and exclusive (X) locks is correct?','Many transactions can hold S locks on an item, but an X lock excludes all others','Many transactions can hold X locks at once','S locks block other S locks','X locks allow concurrent readers','Readers can share, but a writer needs exclusive access.'],
['tx','m','What does the write-ahead logging (WAL) rule require?','Log records describing a change must reach stable storage before the changed data page does','Data pages must be written before the log','The log is optional','Only committed data is logged','WAL enables undo and redo after a crash. It underpins atomicity and durability.'],
['tx','m','What is the main benefit of MVCC (multi-version concurrency control)?','Readers do not block writers and writers do not block readers','It removes the need for transactions','It stores only one version of each row','It disables rollback','Each transaction reads a consistent snapshot of older row versions while writers create new versions.'],
['tx','h','A schedule is recoverable if...','a transaction commits only after every transaction it read from has committed','it is serial','it has no conflicts','all transactions commit at the same time','This prevents a committed transaction from depending on data that is later rolled back.'],
['tx','h','How do you test whether a schedule is conflict serializable?','Build the precedence graph and check that it has no cycle','Count the number of transactions','Check that every transaction commits','Verify that all locks are shared','An edge Ti → Tj exists when Ti has a conflicting operation before Tj. Acyclic means equivalent to a serial order.'],
['tx','h','How does strict two-phase locking avoid cascading rollbacks?','It holds exclusive locks until the transaction commits or aborts','It releases all locks immediately','It never uses exclusive locks','It sorts transactions by id','Other transactions cannot read uncommitted writes, so one abort never forces others to abort.'],
['tx','h','Which anomaly can still occur under snapshot isolation but not under SERIALIZABLE?','Write skew','Dirty read','Lost update on the same row (first committer wins)','Dirty write','Two transactions read overlapping data and update different rows based on it, producing a result no serial order could give.'],
['tx','h','In basic timestamp ordering, a transaction wants to write item X but a younger transaction has already read X. What happens?','The writing transaction is aborted and restarted with a new timestamp','The write is allowed','The reader is aborted','Both commit in order','The write would invalidate a later transaction\'s read in timestamp order, so the older writer must restart.'],

// ---------------- idx
['idx','e','A primary key constraint on a column usually...','Creates an index on it automatically','Makes the table read-only','Removes duplicates in other columns','Encrypts the column','Most databases back a primary key with a unique index so duplicates are found quickly.'],
['idx','m','What is a covering index?','An index that contains every column a query needs, so the table is not read','An index on the whole table','An index that covers two tables','An index with no keys','The engine answers the query from the index alone (an index-only scan), avoiding extra row lookups.'],
['idx','m','When is an index on a column most useful?','When the column has many distinct values and queries filter on it','When the column has only two values','When the table has 5 rows','When the column is never in WHERE','High selectivity means an index lookup narrows to few rows. A boolean column is rarely worth indexing alone.'],
['idx','m','Bitmap indexes are best suited to...','Low-cardinality columns such as gender or status, mostly in analytics','Unique ids','Frequently updated OLTP columns','Free text','One bitmap per distinct value is compact and fast for combining filters, but costly to update.'],
['idx','m','When can a full table scan beat an index lookup?','When the query returns a large fraction of the table','When the table is huge and the query returns 1 row','When the column is unique','Never','Index lookups need random page reads per row. Past a certain fraction, sequential scanning is cheaper.'],
['idx','h','A B+ tree has fan-out 100 (each node holds 100 pointers). Roughly how many keys can a 3-level tree index?','About 1,000,000','About 300','About 10,000','About 100,000,000','Each level multiplies capacity by about 100: 100 × 100 × 100 = 10^6. That is why index lookups need only a few disk reads.'],
['idx','h','For WHERE country = \'IN\' AND age > 30, which composite index is usually best?','(country, age)','(age, country)','(age)','Two separate indexes are always better','Put equality columns first and the range column last, so the engine can seek on country and then scan the age range.'],
['idx','h','What is a sparse index?','An index with entries for only some search keys (e.g. one per block) over a sorted file','An index with no entries','An index on a NULL column','An index stored on another disk','Sparse indexes are smaller than dense ones but require the data file to be sorted on the key.'],
['idx','h','A B+ tree supports range queries efficiently mainly because...','Leaf nodes are linked in key order, so you seek once and scan sequentially','All keys are stored at the root','It hashes the keys','It stores rows unsorted','After finding the first matching leaf, the engine follows leaf pointers to read the rest of the range.'],

// ---------------- er
['er','e','In an ER diagram, a key attribute is usually shown...','Underlined','In bold red','Inside a diamond','With a double border','The underline marks attributes that uniquely identify an entity.'],
['er','e','In ER modeling, an entity set is...','A collection of similar entities, e.g. all students','One single row','A column','A SQL query','An entity set becomes a table. Each entity in it becomes a row.'],
['er','m','What is a composite attribute?','An attribute made of sub-parts, e.g. address = street + city + pin','An attribute with many values','An attribute computed from another','An attribute that is a key','Composite attributes are usually split into separate columns when mapped to a table.'],
['er','m','How are 1:1 relationships typically mapped to tables?','Put a foreign key (unique) on either side, or merge the tables','Create a junction table with three columns','Store a list of ids','They cannot be mapped','Because each row relates to at most one row, a unique foreign key on one side (often the side with total participation) is enough.'],
['er','m','What is a ternary relationship?','A relationship that links three entity sets at once','Three relationships between two entities','A relationship with three attributes','A relationship in 3NF','Example: Supplier supplies Part to Project. It maps to a table with a foreign key to each of the three entities.'],
['er','h','A weak entity is linked to its owner through...','An identifying relationship (shown as a double diamond)','A normal single diamond','A multivalued attribute','A derived attribute','The identifying relationship tells us the weak entity is identified by the owner\'s key plus its own partial key.'],
['er','h','What does aggregation in the ER model allow?','Treating a relationship as an entity so it can take part in another relationship','Summing numeric attributes','Merging two entity sets','Removing weak entities','It lets you model "a relationship between a relationship and an entity", such as a Works_On assignment being monitored by a Manager.'],
['er','h','Student and Course have a many-to-many Enrolls relationship with a grade attribute. How many tables are needed and where does grade go?','3 tables, and grade goes in the Enrollment (junction) table','2 tables, with grade in Student','2 tables, with grade in Course','1 table, with grade anywhere','The relationship attribute depends on the pair (student, course), so it lives in the junction table whose key is (student_id, course_id).'],

// ---------------- opt: storage and query optimization
['opt','e','What is the job of the query optimizer?','Choose an efficient execution plan for a query','Store backups','Check passwords','Compile the application','There are many ways to execute one SQL query. The optimizer estimates costs and picks a cheap plan.'],
['opt','e','What does EXPLAIN (or EXPLAIN ANALYZE) show?','The execution plan the database uses for a query','The meaning of an error','The table definitions','The backup schedule','It reveals scans, index usage, join order and estimated or actual costs, the first tool for slow-query tuning.'],
['opt','m','What do cost-based optimizers rely on?','Statistics such as row counts and value distributions','Random choices','The order of tables in the FROM clause only','The query length','Estimated cardinalities drive cost formulas. Stale statistics lead to bad plans, so run ANALYZE/UPDATE STATISTICS.'],
['opt','m','What is the basic unit of disk I/O in a DBMS?','A page (block)','A single row','A single byte','A table','Rows are stored together in fixed-size pages (e.g. 8 KB), and the DBMS reads and writes whole pages.'],
['opt','m','What does a materialized view add compared to a normal view?','Its query result is physically stored and refreshed','Nothing, they are the same','It cannot be queried','It deletes the base table','Materialized views trade storage and refresh cost for much faster reads of expensive aggregates.'],
['opt','m','Why does an optimizer apply projections early as well as selections?','It drops unused columns so intermediate rows are narrower','It sorts the data','It adds indexes','It removes primary keys','Narrower rows mean more rows per page and less I/O and memory in later operators.'],
['opt','h','R has 100 pages and S has 20 pages. A page-oriented nested-loop join uses R as the outer relation. How many page reads does it need?','2,100','120','2,000','4,000','Read R once (100) and scan all of S for each page of R: 100 + 100 × 20 = 2,100. Using the smaller relation as the outer costs 20 + 20 × 100 = 2,020.'],
['opt','h','External merge sort sorts 1,000 pages with 11 buffer pages. How many passes (including the first run-creation pass) are needed?','3','2','4','10','Pass 0 makes ceil(1000/11) = 91 runs. Each merge pass is 10-way: 91 → 10 → 1. That is 1 + 2 = 3 passes.'],
['opt','h','When is an index nested-loop join a good choice?','When the outer input is small and there is an index on the inner join column','When both inputs are huge and unindexed','When the join has no condition','When inputs are sorted only','Each outer row does one cheap index probe instead of scanning the inner table.'],
['opt','h','Why do left-deep join trees get special attention in optimizers?','They allow pipelining and shrink the plan search space','They always give the lowest cost','They avoid using indexes','They do not need statistics','Restricting to left-deep plans cuts the number of orders to consider, and each join output can feed the next as a stream.'],

// ---------------- dist: distributed and NoSQL
['dist','e','MongoDB is an example of which kind of database?','A document store (NoSQL)','A relational database','A graph database only','A spreadsheet','MongoDB stores JSON-like documents. Redis is key-value, Neo4j is graph, Cassandra is wide-column.'],
['dist','e','Why do databases replicate data across several servers?','For availability and read scaling, and to survive failures','To make the schema smaller','To remove indexes','To avoid backups forever','Copies on other nodes keep serving if one node dies and can share read traffic.'],
['dist','m','What is sharding?','Splitting data horizontally across multiple nodes','Copying the whole database to another node','Compressing tables','Encrypting rows','Each shard holds a subset of rows (by key range or hash), so storage and load scale out.'],
['dist','m','The CAP theorem says that during a network partition a system must choose between...','Consistency and availability','Speed and size','Security and cost','Atomicity and durability','When nodes cannot talk, you either refuse some requests to stay consistent (CP) or answer with possibly stale data (AP).'],
['dist','m','BASE systems favor which consistency model?','Eventual consistency','Strict serializability','No consistency at all','Always instant consistency','Basically Available, Soft state, Eventual consistency: replicas converge over time instead of agreeing on every write.'],
['dist','m','Which kind of database is best at relationship-heavy queries like "friends of friends"?','Graph database','Key-value store','Columnar warehouse','Time-series only','Graph databases store edges directly, so multi-hop traversals avoid expensive joins.'],
['dist','h','What is the blocking problem of two-phase commit (2PC)?','If the coordinator fails after participants vote yes, they must wait holding locks','Participants never vote','It needs three phases','It cannot commit','Prepared participants cannot decide alone, so a coordinator crash can stall them until it recovers.'],
['dist','h','Why is consistent hashing used for sharding or caching?','Adding or removing a node moves only a small fraction of keys','It sorts keys','It encrypts keys','It makes all nodes identical','With plain hash mod N, changing N remaps almost every key. Consistent hashing remaps about 1/N of them.'],
['dist','h','With N replicas, a read quorum R and a write quorum W, when are reads guaranteed to see the latest write?','When R + W > N','When R + W < N','Only when W = 1','Only when R = 1','Overlapping quorums guarantee at least one replica in a read set has the newest write.'],
['dist','h','Range sharding vs hash sharding: what is a typical trade-off?','Range sharding supports range scans but can create hot spots; hash sharding spreads load evenly but scatters ranges','Range sharding spreads load evenly','Hash sharding supports ordered scans','They behave identically','Sequential keys (timestamps) pile onto one range shard, while hashing balances load at the cost of efficient range queries.']
];
const EASY_EXTRA = [
['keys','e','What is a "tuple" in the relational model?','A row of a table','A column of a table','A table','A database','Tuple = row, attribute = column, relation = table.'],
['keys','e','What is an "attribute" in the relational model?','A column of a table','A row of a table','A database','A query','Attributes are the named columns that describe each tuple.'],
['keys','e','A primary key made from several columns is called a...','Composite key','Foreign key','Super table','Surrogate view','A composite key uses two or more columns together to identify a row.'],
['sql','e','Which SQL statement reads data from a table?','SELECT','INSERT','DELETE','ALTER','SELECT retrieves rows. INSERT adds, DELETE removes, ALTER changes the structure.'],
['sql','e','Which clause sorts the result of a query?','ORDER BY','GROUP BY','HAVING','WHERE','ORDER BY sorts. GROUP BY forms groups, HAVING filters groups, WHERE filters rows.'],
['sql','e','Which aggregate function returns the number of rows?','COUNT(*)','SUM(*)','TOTAL(*)','ROWS(*)','COUNT(*) counts rows. SUM adds values of a column.'],
['sql','e','What does SELECT * FROM students; return?','All columns of all rows in students','Only the first row','Only the column names','The number of rows','The asterisk means "all columns".'],
['sql','e','Which statement adds a new row to a table?','INSERT INTO','ADD ROW','APPEND','PUT','INSERT INTO table (cols) VALUES (...) adds a row.'],
['join','e','What does a JOIN do?','Combines rows from two tables based on a related column','Deletes duplicate rows','Sorts a table','Creates a new database','A join matches rows using a condition, usually primary key = foreign key.'],
['tx','e','What does the "I" in ACID stand for?','Isolation','Integrity','Indexing','Inheritance','Isolation means concurrent transactions do not see each other\'s partial work.'],
['tx','e','A transaction is...','A unit of work that is executed completely or not at all','A single SELECT only','A kind of backup','A table','Transactions group several operations so they succeed or fail together.'],
['idx','e','What is the trade-off of adding an index?','Faster reads but slower writes and more storage','Faster everything','Slower reads','No trade-off','Every INSERT, UPDATE or DELETE must also update the index.'],
['er','e','In an ER diagram, a diamond represents...','A relationship','An entity','An attribute','A key','Diamonds are relationships, rectangles are entities, ovals are attributes.'],
['er','e','The relationship between one Department and many Employees is...','One-to-many (1:N)','One-to-one','Many-to-many','Zero-to-zero','Each employee belongs to one department, but a department has many employees.'],
['norm','e','What is the goal of normalization?','Reduce redundancy and avoid update, insert and delete anomalies','Make queries slower','Add more columns','Remove primary keys','Normalization splits tables so each fact is stored once.'],
['arch','e','Which of these is a relational database management system?','PostgreSQL','Photoshop','Excel chart','VLC','PostgreSQL, MySQL, Oracle and SQL Server are RDBMSs.'],
['dist','e','Redis is mostly used as a...','Key-value store and cache','Graph database','Relational database','File system','Redis keeps data in memory as key-value pairs and is widely used for caching.']
];

const ROWS = RAW.map((r, i) => [r[0], OLD_DIFF[i], r[1], r[2], r[3], r[4], r[5], r[6]]).concat(NEW, EASY_EXTRA);
const BANK = ROWS.map((r, i) => ({
  id: i,
  topic: r[0],
  level: LV[r[1]],
  text: r[2],
  options: [r[3], r[4], r[5], r[6]],
  answer: 0,
  explain: r[7]
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
    level: q.level,
    text: q.text,
    options: order.map((k) => q.options[k]),
    answer: order.indexOf(0),
    explain: q.explain
  };
}

// Round-robin by topic so a pick feels varied.
function balanced(pool, k) {
  const by = {};
  shuffle(pool).forEach((q) => (by[q.topic] = by[q.topic] || []).push(q));
  const keys = shuffle(Object.keys(by));
  const out = [];
  while (out.length < k && keys.some((t) => by[t].length)) {
    for (const t of keys) if (by[t].length && out.length < k) out.push(by[t].shift());
  }
  return out;
}

// Pick n questions. level: easy | moderate | hard | mixed. Avoid ids in `used` first.
function pick(n, { topic = null, level = 'mixed', used = new Set() } = {}) {
  const inTopic = (q) => !topic || topic === 'all' || q.topic === topic;
  const fresh = (list) => { const f = list.filter((q) => !used.has(q.id)); return f.length >= Math.min(n, list.length) ? f : list; };
  if (LEVELS[level]) {
    const pool = fresh(BANK.filter((q) => inTopic(q) && q.level === level));
    return shuffle(balanced(pool, n)).map(instance);
  }
  // mixed: roughly 30% easy, 40% moderate, 30% hard
  const quota = { easy: Math.round(n * 0.3), moderate: Math.round(n * 0.4) };
  quota.hard = n - quota.easy - quota.moderate;
  let out = [];
  for (const lv of Object.keys(LEVELS)) out = out.concat(balanced(fresh(BANK.filter((q) => inTopic(q) && q.level === lv)), quota[lv]));
  if (out.length < n) {
    const have = new Set(out.map((q) => q.id));
    out = out.concat(balanced(BANK.filter((q) => inTopic(q) && !have.has(q.id)), n - out.length));
  }
  return shuffle(out).map(instance);
}

module.exports = { TOPICS, LEVELS, BANK, pick, instance };
