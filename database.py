from sqlalchemy import create_engine
from sqlalchemy.orm import scoped_session, sessionmaker
from sqlalchemy.ext.declarative import declarative_base

engine = create_engine('mysql+pymysql://michaelbeer:NVIRock5!@208.97.163.43/nvi_km_dashboard', convert_unicode=True)
Base = declarative_base()
Base.metadata.reflect(engine)

db_session = scoped_session(sessionmaker(autocommit=False, autoflush=False, bind=engine))
Base.query = db_session.query_property()

class Permissions(Base):
    __table__ = Base.metadata.tables['folder_permissions']

class Users(Base):
    __table__ = Base.metadata.tables['users']