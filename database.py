from sqlalchemy import create_engine
from sqlalchemy.orm import scoped_session, sessionmaker
from sqlalchemy.ext.declarative import declarative_base
import config as cfg

engine = create_engine(cfg.db_connect, convert_unicode=True)
Base = declarative_base()
Base.metadata.reflect(engine)

db_session = scoped_session(sessionmaker(autocommit=False, autoflush=False, bind=engine))
Base.query = db_session.query_property()

class Permissions(Base):
    __table__ = Base.metadata.tables['folder_permissions']

class Users(Base):
    __table__ = Base.metadata.tables['users']